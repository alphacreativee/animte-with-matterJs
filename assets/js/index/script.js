document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  const animateOnScroll = false; // Set to false for immediate testing
  const config = {
    gravity: {
      x: 0,
      y: 1,
    },
    restitution: 0.5,
    friction: 0.15,
    frictionAir: 0.02,
    density: 0.002,
    wallThickness: 200, // Reduced wall thickness
    mouseStiffness: 0.6,
  };

  let engine,
    runner,
    mouseConstraint,
    bodies = [],
    topWall = null;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function initPhysics(container) {
    console.log("Initializing physics...");

    engine = Matter.Engine.create();
    engine.gravity.x = config.gravity.x;
    engine.gravity.y = config.gravity.y;
    engine.constraintIterations = 10;
    engine.positionIterations = 20;
    engine.velocityIterations = 16;
    engine.timing.timeScale = 1;

    const containerRect = container.getBoundingClientRect();
    console.log(
      "Container dimensions:",
      containerRect.width,
      "x",
      containerRect.height
    );

    const wallThickness = config.wallThickness;
    const walls = [
      // Bottom wall
      Matter.Bodies.rectangle(
        containerRect.width / 2,
        containerRect.height + wallThickness / 2,
        containerRect.width + wallThickness * 2,
        wallThickness,
        { isStatic: true }
      ),
      // Left wall
      Matter.Bodies.rectangle(
        -wallThickness / 2,
        containerRect.height / 2,
        wallThickness,
        containerRect.height + wallThickness * 2,
        { isStatic: true }
      ),
      // Right wall
      Matter.Bodies.rectangle(
        containerRect.width + wallThickness / 2,
        containerRect.height / 2,
        wallThickness,
        containerRect.height + wallThickness * 2,
        { isStatic: true }
      ),
    ];
    Matter.World.add(engine.world, walls);

    const objects = container.querySelectorAll(".object");
    console.log("Found", objects.length, "objects");

    // FIXED: Better object spawning
    objects.forEach((obj, index) => {
      // Set a default size if getBoundingClientRect returns 0
      const objRect = obj.getBoundingClientRect();
      // const objWidth = objRect.width || 120; // Default width
      // const objHeight = objRect.height || 60; // Default height

      // // Better spawn positioning
      // const columns = Math.ceil(Math.sqrt(objects.length)); // Arrange in grid-like pattern
      // const row = Math.floor(index / columns);
      // const col = index % columns;

      // const startX = (containerRect.width / (columns + 1)) * (col + 1);
      // const startY = -100 - row * 150; // Less negative, closer spacing
      // const startRotation = (Math.random() - 0.5) * 0.5; // Less rotation

      // console.log(`Spawning object ${index + 1} at:`, startX, startY);
      const startX =
        Math.random() * (containerRect.width - objRect.width) +
        objRect.width / 2;
      const startY = -500 - index * 200;
      const startRotation = (Math.random() - 0.5) * Math.PI; // Less rotation
      const body = Matter.Bodies.rectangle(
        startX,
        startY,
        objRect.width,
        objRect.height,
        {
          restitution: config.restitution,
          friction: config.friction,
          frictionAir: config.frictionAir,
          density: config.density,
        }
      );

      Matter.Body.setAngle(body, startRotation);

      bodies.push({
        body: body,
        element: obj,
        width: objRect.width,
        height: objRect.height,
      });

      Matter.World.add(engine.world, body);
    });

    console.log("Added", bodies.length, "physics bodies");

    // Add top wall after delay
    setTimeout(() => {
      topWall = Matter.Bodies.rectangle(
        containerRect.width / 2,
        -wallThickness / 2,
        containerRect.width + wallThickness * 2,
        wallThickness,
        { isStatic: true }
      );
      Matter.World.add(engine.world, topWall);
      console.log("Top wall added");
    }, 5000); // Increased delay

    const mouse = Matter.Mouse.create(container);
    mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

    mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: config.mouseStiffness,
        render: { visible: false },
      },
    });
    mouseConstraint.mouse.element.oncontextmenu = () => false;

    let dragging = null;
    let originalInertia = null;

    Matter.Events.on(mouseConstraint, "startdrag", function (event) {
      dragging = event.body;
      if (dragging) {
        originalInertia = dragging.inertia;
        Matter.Body.setInertia(dragging, Infinity);
        Matter.Body.setVelocity(dragging, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(dragging, 0);
      }
    });

    Matter.Events.on(mouseConstraint, "enddrag", function (event) {
      if (dragging) {
        Matter.Body.setInertia(dragging, originalInertia || 1);
        dragging = null;
        originalInertia = null;
      }
    });

    Matter.Events.on(engine, "beforeUpdate", function () {
      if (dragging) {
        const found = bodies.find((b) => b.body === dragging);
        if (found) {
          const minX = found.width / 2;
          const maxX = containerRect.width - found.width / 2;
          const minY = found.height / 2;
          const maxY = containerRect.height - found.height / 2;

          Matter.Body.setPosition(dragging, {
            x: clamp(dragging.position.x, minX, maxX),
            y: clamp(dragging.position.y, minY, maxY),
          });
          Matter.Body.setVelocity(dragging, {
            x: clamp(dragging.velocity.x, -20, 20),
            y: clamp(dragging.velocity.y, -20, 20),
          });
        }
      }
    });

    container.addEventListener("mouseleave", (e) => {
      if (mouseConstraint && mouseConstraint.constraint) {
        mouseConstraint.constraint.bodyB = null;
        mouseConstraint.constraint.pointB = null;
      }
    });

    document.addEventListener("mouseup", (e) => {
      if (mouseConstraint && mouseConstraint.constraint) {
        mouseConstraint.constraint.bodyB = null;
        mouseConstraint.constraint.pointB = null;
      }
    });

    Matter.World.add(engine.world, mouseConstraint);
    runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    function updatePositions() {
      bodies.forEach(({ body, element, width, height }) => {
        const x = clamp(
          body.position.x - width / 2,
          0,
          containerRect.width - width
        );

        const y = clamp(
          body.position.y - height / 2,
          -height * 3, // Allow more space above
          containerRect.height - height
        );

        element.style.left = x + "px";
        element.style.top = y + "px";
        element.style.transform = `rotate(${body.angle}rad)`;
      });

      requestAnimationFrame(updatePositions);
    }
    updatePositions();
  }

  if (animateOnScroll) {
    document.querySelectorAll("section").forEach((section) => {
      if (section.querySelector(".object-container")) {
        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          once: true,
          onEnter: () => {
            const container = section.querySelector(".object-container");
            if (container && !engine) {
              initPhysics(container);
            }
          },
        });
      }
    });
  } else {
    // Wait a bit for DOM to fully render
    setTimeout(() => {
      const container = document.querySelector(".object-container");
      if (container) {
        console.log("Starting physics simulation...");
        initPhysics(container);
      } else {
        console.error("Container not found!");
      }
    }, 100);
  }
});
