const { watch, dest, src, series, parallel } = require("gulp");
const browserSync = require("browser-sync").create();
const rename = require("gulp-rename");
const uglify = require("gulp-uglify");
const cleanCSS = require("gulp-clean-css");
const plumber = require("gulp-plumber");

// Task xử lý JavaScript
function js() {
  return src("assets/js/index/*.js", { allowEmpty: true })
    .pipe(plumber())
    .pipe(uglify())
    .pipe(rename({ suffix: ".min" }))
    .pipe(dest("assets/main/js"))
    .pipe(browserSync.stream());
}

// Task xử lý CSS thường
function css() {
  return src("assets/css/*.css", { allowEmpty: true }) // Lấy tất cả file .css trong assets/css
    .pipe(plumber())
    .pipe(cleanCSS()) // Nén file CSS
    .pipe(rename({ suffix: ".min" })) // Thêm hậu tố .min
    .pipe(dest("assets/main/css")) // Xuất file đã nén vào assets/main/css
    .pipe(browserSync.stream());
}

// Task theo dõi file và chạy server
function taskWatch() {
  browserSync.init({
    server: {
      baseDir: "./",
    },
    injectChanges: true,
    notify: false,
  });
  watch("assets/js/index/*.js", js);
  watch("assets/css/*.css", css); // Theo dõi file CSS
  watch("*.html").on("change", browserSync.reload);
}

// Task mặc định
exports.default = series(parallel(js, css), taskWatch);

// Task riêng lẻ
exports.js = js;
exports.css = css;
