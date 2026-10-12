import AVFoundation
// mux.swift video.mp4 out.mp4 timeline.txt a1.mp3 a2.mp3 … — each line's audio at its start time
let a = CommandLine.arguments
let vid = AVURLAsset(url: URL(fileURLWithPath: a[1])); let out = URL(fileURLWithPath: a[2])
let starts = try! String(contentsOfFile: a[3], encoding: .utf8).split(separator: "\n").map { Double($0)! }
let comp = AVMutableComposition()
let vt = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try! vt.insertTimeRange(CMTimeRange(start: .zero, duration: vid.duration), of: vid.tracks(withMediaType: .video)[0], at: .zero)
let at = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
for (i, p) in a.dropFirst(4).enumerated() {
  let s = AVURLAsset(url: URL(fileURLWithPath: p)); let tr = s.tracks(withMediaType: .audio)[0]
  var dur = s.duration; let start = CMTime(seconds: starts[i], preferredTimescale: 600)
  if start + dur > vid.duration { dur = vid.duration - start }
  try! at.insertTimeRange(CMTimeRange(start: .zero, duration: dur), of: tr, at: start)
}
try? FileManager.default.removeItem(at: out)
let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPreset1280x720)!
ex.outputURL = out; ex.outputFileType = .mp4; ex.fileLengthLimit = 14_000_000
let sem = DispatchSemaphore(value: 0); ex.exportAsynchronously { sem.signal() }; sem.wait()
print(ex.status == .completed ? "ok \(comp.duration.seconds)s" : "fail \(String(describing: ex.error))")
