#import <AppKit/AppKit.h>
#import "BundleUtils.h"

@implementation BundleUtils

+ (NSString *)getLocalizedBundleDisplayNameWithPath:(NSString *)bundlePath {
    NSBundle *bundle = [NSBundle bundleWithPath:bundlePath];
    if (bundle == nil)
        return nil;
    
    NSString *bundleName = [[bundle localizedInfoDictionary] objectForKey:@"CFBundleName"];
    if (bundleName)
        return bundleName;
    
    NSString *bundleDisplayName = [[bundle localizedInfoDictionary] objectForKey:@"CFBundleDisplayName"];
    return bundleDisplayName;
}

+ (BOOL)saveApplicationIconAsPngWithPath:(NSString *)bundlePath pngPath:(NSString *)pngPath {
    NSBundle *bundle = [NSBundle bundleWithPath:bundlePath];
    if (bundle == nil)
        return NO;
    
    NSString *iconFilename = [bundle objectForInfoDictionaryKey:@"CFBundleIconFile"];
    if (iconFilename == nil)
        return NO;
    
    NSString *iconBasename = [iconFilename stringByDeletingPathExtension];
    NSString *iconExtension = [iconFilename pathExtension];
    if (iconExtension == nil || [iconExtension length] <= 0)
        iconExtension = @"icns";
    
    NSString *iconPath = [bundle pathForResource:iconBasename ofType:iconExtension];
    if (iconPath == nil || [iconPath length] <= 0)
        return NO;
    
    NSImage *iconImage = [[NSImage alloc] initWithContentsOfFile:iconPath];
    CGImageRef cgRef = [iconImage CGImageForProposedRect:nil context:nil hints:nil];
    NSBitmapImageRep *bitmapRep = [[NSBitmapImageRep alloc] initWithCGImage:cgRef];
    [bitmapRep setSize:[iconImage size]];
    NSData *pngData = [bitmapRep representationUsingType:NSPNGFileType properties:@{}];
    [pngData writeToFile:pngPath atomically:YES];
    
    return YES;
}

@end
