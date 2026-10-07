import AppKit
import Foundation

let width: CGFloat = 1024
let height: CGFloat = 500

guard let canvas = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: Int(width), pixelsHigh: Int(height),
    bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false,
    isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: Int(width) * 4, bitsPerPixel: 32
), let graphics = NSGraphicsContext(bitmapImageRep: canvas) else {
    fatalError("Failed to create exact-size canvas")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphics

guard let ctx = NSGraphicsContext.current?.cgContext else {
    print("Failed to get context")
    exit(1)
}

// 1. Draw rich background gradient: deep slate/navy #07192C to #0D3256
let colorSpace = CGColorSpaceCreateDeviceRGB()
let colors = [
    NSColor(red: 7/255.0, green: 25/255.0, blue: 44/255.0, alpha: 1.0).cgColor,
    NSColor(red: 13/255.0, green: 50/255.0, blue: 86/255.0, alpha: 1.0).cgColor,
    NSColor(red: 16/255.0, green: 38/255.0, blue: 68/255.0, alpha: 1.0).cgColor
] as CFArray

if let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0.0, 0.55, 1.0]) {
    ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: height), end: CGPoint(x: width, y: 0), options: [])
}

// Draw subtle ambient glow circles in background
ctx.saveGState()
let glowColor = NSColor(red: 37/255.0, green: 99/255.0, blue: 235/255.0, alpha: 0.22).cgColor
ctx.setFillColor(glowColor)
ctx.addEllipse(in: CGRect(x: 700, y: 150, width: 350, height: 350))
ctx.fillPath()

let tealGlow = NSColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 0.15).cgColor
ctx.setFillColor(tealGlow)
ctx.addEllipse(in: CGRect(x: -50, y: -50, width: 350, height: 350))
ctx.fillPath()
ctx.restoreGState()

// 2. Draw app icon on the left / center-left
let iconPath = "assets/images/icon.png"
if let iconImage = NSImage(contentsOfFile: iconPath) {
    let iconSize: CGFloat = 260
    let iconX: CGFloat = 85
    let iconY: CGFloat = (height - iconSize) / 2.0
    
    // Draw subtle shadow behind icon
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -12), blur: 30, color: NSColor.black.withAlphaComponent(0.45).cgColor)
    
    // Clip rounded rect for icon
    let cornerRadius: CGFloat = 54
    let iconRect = CGRect(x: iconX, y: iconY, width: iconSize, height: iconSize)
    let clipPath = NSBezierPath(roundedRect: iconRect, xRadius: cornerRadius, yRadius: cornerRadius)
    clipPath.addClip()
    iconImage.draw(in: iconRect, from: NSRect.zero, operation: .sourceOver, fraction: 1.0)
    ctx.restoreGState()
    
    // Border around icon
    let borderPath = NSBezierPath(roundedRect: iconRect, xRadius: cornerRadius, yRadius: cornerRadius)
    borderPath.lineWidth = 3.0
    NSColor(white: 1.0, alpha: 0.2).setStroke()
    borderPath.stroke()
}

// 3. Draw Brand Name "Dose Tracker"
let titleFont = NSFont.systemFont(ofSize: 66, weight: .bold)
let titleAttrs: [NSAttributedString.Key: Any] = [
    .font: titleFont,
    .foregroundColor: NSColor.white
]
let titleStr = NSAttributedString(string: "Dose Tracker", attributes: titleAttrs)
titleStr.draw(at: NSPoint(x: 395, y: 295))

// 4. Draw Tagline "Medicines, reminders & dose history"
let tagFont = NSFont.systemFont(ofSize: 25, weight: .medium)
let tagAttrs: [NSAttributedString.Key: Any] = [
    .font: tagFont,
    .foregroundColor: NSColor(red: 147/255.0, green: 197/255.0, blue: 253/255.0, alpha: 1.0) // Soft sky blue
]
let tagStr = NSAttributedString(string: "Medicines, reminders & dose history", attributes: tagAttrs)
tagStr.draw(at: NSPoint(x: 395, y: 250))

// 5. Draw 3 Feature Badges
let features = [
    ("", "Dose history"),
    ("", "Stock tracking"),
    ("", "Care profiles")
]

var curX: CGFloat = 395
let badgeY: CGFloat = 160
let badgeHeight: CGFloat = 46

for (icon, label) in features {
    let font = NSFont.systemFont(ofSize: 15, weight: .semibold)
    let text = icon.isEmpty ? label : "\(icon)  \(label)"
    let textAttrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor(white: 0.95, alpha: 1.0)
    ]
    let str = NSAttributedString(string: text, attributes: textAttrs)
    let textSize = str.size()
    let badgeWidth = textSize.width + 30
    
    // Draw badge pill
    let pillRect = CGRect(x: curX, y: badgeY, width: badgeWidth, height: badgeHeight)
    let pillPath = NSBezierPath(roundedRect: pillRect, xRadius: 23, yRadius: 23)
    NSColor(white: 1.0, alpha: 0.08).setFill()
    pillPath.fill()
    NSColor(white: 1.0, alpha: 0.18).setStroke()
    pillPath.lineWidth = 1.2
    pillPath.stroke()
    
    // Draw text inside pill
    let textPoint = CGPoint(x: curX + 15, y: badgeY + (badgeHeight - textSize.height)/2.0 - 1)
    str.draw(at: textPoint)
    
    curX += badgeWidth + 14
}

// 6. Draw bottom highlight line
let highlightFont = NSFont.systemFont(ofSize: 15, weight: .regular)
let highlightAttrs: [NSAttributedString.Key: Any] = [
    .font: highlightFont,
    .foregroundColor: NSColor(white: 0.72, alpha: 1.0)
]
let highlightStr = NSAttributedString(string: "Local health records  •  No account required", attributes: highlightAttrs)
highlightStr.draw(at: NSPoint(x: 395, y: 110))

NSGraphicsContext.restoreGraphicsState()

guard let pngData = canvas.representation(using: .png, properties: [:]) else {
    print("Failed to encode PNG")
    exit(1)
}

let outputPath = "playstore_assets/feature_graphic_1024x500.png"
do {
    try pngData.write(to: URL(fileURLWithPath: outputPath))
    print("Successfully generated \(outputPath)")
} catch {
    print("Error saving: \(error)")
    exit(1)
}
