async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function _authentication_done() {
  await wait(500);
  var body = document.querySelector("body");
  body.style.opacity = 0;
}

function authentication_done() {
  if (lightdm.is_authenticated) _authentication_done();
}

function initGreeter() {
  lightdm.authentication_complete?.connect(() => authentication_done());
}

if (window._ready_event === undefined) {
  _ready_event = new Event("GreeterReady");
  window.dispatchEvent(_ready_event);
}

window.addEventListener("GreeterReady", initGreeter);
