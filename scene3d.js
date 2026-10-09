/* 3D classroom stub. Full scene arrives in Phase 4. */
var ClassScene = (function () {
  /* Build the scene, return false when WebGL is unavailable. */
  function init(containerEl) {
    return false;
  }

  /* Create or update desks for the given students. */
  function render(studentsWithStatus) {
    return;
  }

  /* Register the desk click callback. */
  function onSelect(callback) {
    return;
  }

  /* Set noise meter jitter from 0 to 1. */
  function setShake(level) {
    return;
  }

  return { init: init, render: render, onSelect: onSelect, setShake: setShake };
})();

if (typeof module !== "undefined") {
  module.exports = ClassScene;
}
