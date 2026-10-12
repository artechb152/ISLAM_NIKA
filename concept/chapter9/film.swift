import AVFoundation
import CoreImage
import AppKit
// Renders a smooth film: segments are either a still with a slow zoom (Ken Burns), or a
// clip copied frame for frame at its REAL speed. Zooms are chosen so every cut lands at
// scale 1.0 on the same picture the clip starts/ends on — no jump, no stretched frames.
// args: out W H fps then specs: still:path:sec:fromScale:toScale | clip:path
let a = Array(CommandLine.arguments.dropFirst())
let out = URL(fileURLWithPath: a[0]); let W = Int(a[1])!, H = Int(a[2])!, fps = Int32(a[3])!
try? FileManager.default.removeItem(at: out)
let w = try! AVAssetWriter(outputURL: out, fileType: .mp4)
let inp = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_200_000]])
let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: inp, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
w.add(inp); w.startWriting(); w.startSession(atSourceTime: .zero)
let ctx = CIContext()
var frame: Int64 = 0
var last: CIImage? = nil
func push(_ img: CIImage) {
  while !inp.isReadyForMoreMediaData { usleep(2000) }
  var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &pb)
  ctx.render(img, to: pb!); last = img
  ad.append(pb!, withPresentationTime: CMTime(value: frame, timescale: fps)); frame += 1
}
func fit(_ img: CIImage, scale s: CGFloat) -> CIImage {
  let e = img.extent; let base = max(CGFloat(W) / e.width, CGFloat(H) / e.height) * s
  let t = img.transformed(by: CGAffineTransform(scaleX: base, y: base))
  let x = (t.extent.width - CGFloat(W)) / 2, y = (t.extent.height - CGFloat(H)) / 2
  return t.transformed(by: CGAffineTransform(translationX: -t.extent.minX - x, y: -t.extent.minY - y)).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
}
for spec in a.dropFirst(4) {
  let p = spec.split(separator: ":").map(String.init)
  if p[0] == "still" || p[0] == "hold" {
    /* hold: the clip's own last frame, so the cut out of a clip can never jump */
    let img = p[0] == "hold" ? last! : CIImage(contentsOf: URL(fileURLWithPath: p[1]))!
    let n = Int(Double(p[2])! * Double(fps)); let s0 = CGFloat(Double(p[3])!), s1 = CGFloat(Double(p[4])!)
    let fade = p.count > 5 ? Int(Double(p[5])! * Double(fps)) : 0; let prev = last
    for i in 0..<n { let t = CGFloat(i) / CGFloat(max(1, n - 1)); let e = t * t * (3 - 2 * t); var f = fit(img, scale: s0 + (s1 - s0) * e)
      if i < fade, let pv = prev { let k = CGFloat(i) / CGFloat(fade); f = f.applyingFilter("CIDissolveTransition", parameters: [kCIInputTargetImageKey: f, kCIInputImageKey: pv, "inputTime": k]) }
      push(f) }
  } else {
    let asset = AVURLAsset(url: URL(fileURLWithPath: p[1]))
    let r = try! AVAssetReader(asset: asset)
    let o = AVAssetReaderTrackOutput(track: asset.tracks(withMediaType: .video)[0], outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    r.add(o); r.startReading()
    while let sb = o.copyNextSampleBuffer(), let ib = CMSampleBufferGetImageBuffer(sb) { push(fit(CIImage(cvPixelBuffer: ib), scale: 1)) }
  }
}
inp.markAsFinished(); let sem = DispatchSemaphore(value: 0); w.finishWriting { sem.signal() }; sem.wait()
print(w.status == .completed ? "ok \(Double(frame) / Double(fps))s" : "fail \(String(describing: w.error))")
