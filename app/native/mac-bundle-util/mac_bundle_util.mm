#include <node.h>
#include <nan.h>
#include "BundleUtils.h"

using v8::Local;
using v8::Value;
using v8::Object;
using v8::Function;
using v8::String;
using Nan::New;
using Nan::Null;

NAN_METHOD(getLocalizedBundleDisplayName) {
	v8::String::Utf8Value param1(info[0]->ToString());

  @autoreleasepool {
    NSString *bundlePath = [NSString stringWithUTF8String:*param1];
    NSString *bundleName = [BundleUtils getLocalizedBundleDisplayNameWithPath: bundlePath];
    info.GetReturnValue().Set(Nan::New([bundleName UTF8String]).ToLocalChecked());
  }
}

NAN_METHOD(saveApplicationIconAsPng) {
	v8::String::Utf8Value param1(info[0]->ToString());
	v8::String::Utf8Value param2(info[1]->ToString());

  @autoreleasepool {
    NSString *bundlePath = [NSString stringWithUTF8String:*param1];
    NSString *pngPath = [NSString stringWithUTF8String:*param2];
    
    BOOL success = [BundleUtils saveApplicationIconAsPngWithPath: bundlePath pngPath: pngPath];
    info.GetReturnValue().Set(success);
  }
}

void Init(Local<Object> exports) {
  exports->Set(New("getLocalizedBundleDisplayName").ToLocalChecked(),
    New<v8::FunctionTemplate>(getLocalizedBundleDisplayName)->GetFunction());
  exports->Set(New("saveApplicationIconAsPng").ToLocalChecked(),
    New<v8::FunctionTemplate>(saveApplicationIconAsPng)->GetFunction());
}

NODE_MODULE(mac_bundle_util, Init)
