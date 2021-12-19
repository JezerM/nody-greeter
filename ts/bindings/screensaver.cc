#include <node.h>
#include <stdlib.h>
#include <X11/Xos.h>
#include <X11/Xlib.h>

namespace screensaver {

using namespace v8;

void Method(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  args.GetReturnValue().Set(String::NewFromUtf8(
      isolate, "world").ToLocalChecked());
}

Display* OpenDisplay(Isolate* isolate) {
  Display *display;
  char *disp = NULL;
  display = XOpenDisplay(disp);

  if (display == NULL) { // Error
    isolate->ThrowException(
        Exception::Error(
          String::NewFromUtf8(
            isolate,
            "Unable to open display"
            ).ToLocalChecked()));
    return NULL;
  }
  return display;
}

void GetScreenSaver(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  int timeout, interval, prefer_blank, allow_exp;

  Display *display = OpenDisplay(isolate);
  if (display == NULL) return;

  XGetScreenSaver(display, &timeout, &interval, &prefer_blank, &allow_exp);
  XCloseDisplay(display);

  Local<Object> obj = Object::New(isolate);
  obj->Set(context,
      String::NewFromUtf8(isolate, "timeout").ToLocalChecked(),
      Number::New(isolate, timeout)
      );
  obj->Set(context,
      String::NewFromUtf8(isolate, "interval").ToLocalChecked(),
      Number::New(isolate, interval)
      );
  obj->Set(context,
      String::NewFromUtf8(isolate, "prefer_blank").ToLocalChecked(),
      Number::New(isolate, prefer_blank)
      );
  obj->Set(context,
      String::NewFromUtf8(isolate, "allow_exp").ToLocalChecked(),
      Number::New(isolate, allow_exp)
      );
  args.GetReturnValue().Set(obj);
}

void SetScreenSaver(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  if (args.Length() < 1) {
    isolate->ThrowException(
        Exception::TypeError(
          String::NewFromUtf8(isolate,
            "Wrong number of arguments").ToLocalChecked()));
    return;
  }

  for (int i = 0; i < args.Length(); i++) {
    if (!args[i]->IsNumber() && !args[i]->IsUndefined()) {
      isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate,
              "Wrong arguments").ToLocalChecked()));
      return;
    }
  }

  int timeout, interval, prefer_blank, allow_exp;

  Display *display = OpenDisplay(isolate);
  if (display == NULL) return;
  XGetScreenSaver(display, &timeout, &interval, &prefer_blank, &allow_exp);

  if (args.Length() > 0 && !args[0]->IsUndefined()) {
    timeout = args[0].As<Number>()->Value();
  }
  if (args.Length() > 1 && !args[1]->IsUndefined()) {
    interval = args[1].As<Number>()->Value();
  }
  if (args.Length() > 2 && !args[2]->IsUndefined()) {
    prefer_blank = args[2].As<Number>()->Value();
  }
  if (args.Length() > 3 && !args[3]->IsUndefined()) {
    allow_exp = args[3].As<Number>()->Value();
  }

  XSetScreenSaver(display, timeout, interval, prefer_blank, allow_exp);

  XCloseDisplay(display);
}

void Initialize(Local<Object> exports) {
  NODE_SET_METHOD(exports, "getScreenSaver", GetScreenSaver);
  NODE_SET_METHOD(exports, "setScreenSaver", SetScreenSaver);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

} // namespace screensaver
