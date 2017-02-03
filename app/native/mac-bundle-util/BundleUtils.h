#import <Foundation/Foundation.h>

@interface BundleUtils : NSObject

+ (NSString*)getLocalizedBundleDisplayNameWithPath: (NSString *)bundlePath;
+ (BOOL)saveApplicationIconAsPngWithPath: (NSString *)bundlePath pngPath:(NSString *)pngPath;

@end
