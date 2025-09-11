// components/reports/report-detail-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "./status-badge"
import { IssueTypeBadge } from "./issue-type-badge"
import { MapPin, ExternalLink, Copy } from "lucide-react"
import type { Report, StatusHistoryEntry } from "@/lib/types"
import { useReportActions } from "@/hooks/use-report-actions"

interface ReportDetailModalProps {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toDateSafe(ts: any): Date | null {
  if (!ts && ts !== 0) return null
  if (typeof ts.toDate === "function") {
    try {
      return ts.toDate()
    } catch {
      // fallthrough
    }
  }
  if (typeof ts.toMillis === "function") {
    try {
      return new Date(ts.toMillis())
    } catch {
      // fallthrough
    }
  }
  if (ts instanceof Date) return ts
  if (typeof ts === "number") return new Date(ts)
  return null
}

/**
 * MediaPlayer - smartly plays audio/video.
 * - If the file is a Cloudinary 3gp, we request Cloudinary's on-the-fly mp3 conversion (f_mp3).
 * - For common audio extensions we use <audio>.
 * - For other containers (3gp, mov, etc.) we use <video>.
 * - UI: Copy URL + Open in new tab buttons + gentle error message (no console spam).
 */
function MediaPlayer({ src }: { src: string }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  if (!src) return null

  // Determine extension (ignore querystring)
  const ext = (src.split("?")[0].split(".").pop() || "").toLowerCase()
  let playbackUrl = src

  // If Cloudinary 3gp deliverable, prefer an mp3 conversion for browser-friendly playback
  if (ext === "3gp" && src.includes("/upload/")) {
    playbackUrl = src.replace("/upload/", "/upload/f_mp3/")
  }

  const audioExts = ["mp3", "wav", "ogg", "aac", "m4a"]
  const videoExts = ["mp4", "webm", "mov", "3gp", "3g2"]
  const isAudio = audioExts.includes(ext) || playbackUrl.includes("f_mp3")
  const isVideo = videoExts.includes(ext) && !isAudio

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore clipboard failures */
    }
  }

  const openInNewTab = (url: string) => {
    try {
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      /* ignore open failures */
    }
  }

  const onMediaError = (e: React.SyntheticEvent<HTMLMediaElement, Event>) => {
    // Do NOT spam console. Show a small user-friendly message instead.
    setErrorMsg("Playback failed in-page. Use 'Open in new tab' to listen.")
  }

  return (
    <div>
      {isAudio ? (
        <audio controls preload="metadata" style={{ width: "100%" }} onError={onMediaError}>
          <source src={playbackUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      ) : (
        <video controls preload="metadata" style={{ width: "100%", maxHeight: 420 }} onError={onMediaError}>
          <source src={playbackUrl} />
          Your browser does not support the video element.
        </video>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button variant="outline" size="sm" onClick={() => copyToClipboard(playbackUrl)}>
          <Copy className="h-4 w-4 mr-1" /> Copy URL
        </Button>
        <Button variant="outline" size="sm" onClick={() => openInNewTab(playbackUrl)}>
          <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
        </Button>
      </div>

      {errorMsg && <div style={{ color: "#ef4444", marginTop: 8, fontSize: 13 }}>{errorMsg}</div>}
    </div>
  )
}

export function ReportDetailModal({ report, open, onOpenChange }: ReportDetailModalProps) {
  const [classification, setClassification] = useState("")
  const [classificationNote, setClassificationNote] = useState("")
  const [assignedDept, setAssignedDept] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [status, setStatus] = useState("")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const [reporterName, setReporterName] = useState<string | null>(null)
  const [reporterLoading, setReporterLoading] = useState(false)

  const { updateReportStatus, updateReportAssignment, updateReportClassification } = useReportActions()

  // Reset form fields whenever a new report opens
  useEffect(() => {
    setClassification("")
    setClassificationNote("")
    setAssignedDept("")
    setAssignedTo("")
    setStatus("")
    setNote("")
    setIsUpdating(false)
  }, [report?.id, open])

  // Fetch reporter profile for friendly name
  useEffect(() => {
    let mounted = true
    async function fetchReporter() {
      if (!report?.uid) {
        setReporterName(null)
        return
      }
      setReporterLoading(true)
      try {
        const userDoc = await getDoc(doc(db, "users", report.uid))
        if (!mounted) return
        if (userDoc.exists()) {
          const data = userDoc.data()
          const name = (data as any).name ?? (data as any).displayName ?? (data as any).fullName ?? null
          setReporterName(name)
        } else {
          setReporterName(null)
        }
      } catch (err) {
        // swallow the error but keep UI usable
        setReporterName(null)
      } finally {
        if (mounted) setReporterLoading(false)
      }
    }
    fetchReporter()
    return () => {
      mounted = false
    }
  }, [report?.uid])

  if (!open) return null
  if (!report) return null

  const handleStatusUpdate = async () => {
    if (!status) return
    setIsUpdating(true)
    try {
      await updateReportStatus(report.id, status as any, note)
      setStatus("")
      setNote("")
    } catch {
      /* ignore - updateReportStatus handles its own logging */
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignmentUpdate = async () => {
    if (!assignedDept && !assignedTo) return
    setIsUpdating(true)
    try {
      await updateReportAssignment(report.id, assignedDept || undefined, assignedTo || undefined)
      setAssignedDept("")
      setAssignedTo("")
    } catch {
      /* ignore */
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClassificationUpdate = async () => {
    if (!classification) return
    setIsUpdating(true)
    try {
      await updateReportClassification(report.id, classification, classificationNote)
      setClassification("")
      setClassificationNote("")
    } catch {
      /* ignore */
    } finally {
      setIsUpdating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  const openInNewTab = (url: string) => {
    try {
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      /* ignore */
    }
  }

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`
    openInNewTab(url)
  }

  // safe arrays / values
  const statusHistory: StatusHistoryEntry[] = Array.isArray(report.statusHistory) ? report.statusHistory : []

  const createdAtDate = toDateSafe(report.createdAt)
  const createdAtText = createdAtDate ? format(createdAtDate, "MMMM dd, yyyy 'at' HH:mm") : "Unknown"

  // Styles for roomy full-screen modal (inline to avoid overrides)
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  }
  const backdropStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(15,23,42,0.6)",
  }
  const panelStyle: React.CSSProperties = {
    position: "relative",
    width: "min(1200px, 96vw)",
    height: "92vh",
    background: "var(--card-bg, #fff)",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(2,6,23,0.2)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    zIndex: 10000,
  }
  const headerStyle: React.CSSProperties = {
    padding: 16,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  }
  const bodyStyle: React.CSSProperties = {
    display: "flex",
    flex: 1,
    gap: 20,
    padding: 16,
    overflow: "hidden",
  }
  const leftColStyle: React.CSSProperties = {
    width: "60%",
    overflowY: "auto",
    paddingRight: 8,
  }
  const rightColStyle: React.CSSProperties = {
    width: "40%",
    overflowY: "auto",
    paddingLeft: 8,
    borderLeft: "1px solid rgba(0,0,0,0.04)",
  }
  const mediaImgStyle: React.CSSProperties = {
    width: "100%",
    maxHeight: 380,
    objectFit: "contain",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.06)",
  }

  return (
    <div role="dialog" aria-modal="true" style={overlayStyle}>
      <div style={backdropStyle} onClick={() => onOpenChange(false)} />

      <div style={panelStyle} aria-live="polite">
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>
              Report Details
            </h3>
            <StatusBadge status={report.status} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)" }}>{createdAtText}</div>
            <button
              onClick={() => onOpenChange(false)}
              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20 }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {/* Left column */}
          <div style={leftColStyle}>
            <section style={{ marginBottom: 18 }}>
              <h4 style={{ margin: 0, fontWeight: 600 }}>Report Information</h4>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <IssueTypeBadge issueType={report.issueType} />
                  {report.classification && <Badge variant="secondary">{report.classification}</Badge>}
                </div>

                <div>
                  <Label className="text-sm font-medium">Issue</Label>
                  <div style={{ marginTop: 6 }}>{report.issueLabel}</div>
                  {report.customIssue && (
                    <div style={{ marginTop: 6, color: "var(--muted-foreground, #64748b)" }}>Custom: {report.customIssue}</div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{report.description}</div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Reporter</Label>
                  <div style={{ marginTop: 6 }}>
                    {reporterLoading ? "Loading…" : reporterName ?? report.uid}
                  </div>
                </div>
              </div>
            </section>

            {/* Media */}
            {(report.imageUrl || report.audioUrl) && (
              <section style={{ marginBottom: 18 }}>
                <h4 style={{ margin: 0, fontWeight: 600 }}>Media</h4>
                <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                  {report.imageUrl && (
                    <div>
                      <img src={report.imageUrl} alt="Report" style={mediaImgStyle} />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <Button variant="outline" size="sm" onClick={() => openInNewTab(report.imageUrl!)}>
                          <ExternalLink className="h-4 w-4 mr-1" /> Open Image
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(report.imageUrl!)}>
                          <Copy className="h-4 w-4 mr-1" /> Copy URL
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* <-- AUDIO handled by MediaPlayer (no console.error spam) --> */}
                  {report.audioUrl && <MediaPlayer src={report.audioUrl} />}
                </div>
              </section>
            )}

            {/* Location quick open */}
            {report.location && (
              <section style={{ marginBottom: 18 }}>
                <h4 style={{ margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin className="h-4 w-4" />
                  Location
                </h4>
                <div style={{ marginTop: 8 }}>
                  <div>Lat: {(report.location as any).latitude ?? (report.location as any).lat}</div>
                  <div>Lng: {(report.location as any).longitude ?? (report.location as any).lng}</div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openInMaps(
                          (report.location as any).latitude ?? (report.location as any).lat,
                          (report.location as any).longitude ?? (report.location as any).lng
                        )
                      }
                    >
                      Open in Google Maps
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${(report.location as any).latitude ?? (report.location as any).lat},${(report.location as any).longitude ?? (report.location as any).lng}`
                        )
                      }
                    >
                      Copy coords
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div style={rightColStyle}>
            <section style={{ marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontWeight: 600 }}>Current Assignment</h4>
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <Label className="text-sm">Department</Label>
                  <div style={{ marginTop: 6 }}>
                    {report.assignedDept ? <Badge variant="outline">{report.assignedDept}</Badge> : <span style={{ color: "var(--muted-foreground, #64748b)" }}>Unassigned</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Assigned To</Label>
                  <div style={{ marginTop: 6 }}>{report.assignedTo || <span style={{ color: "var(--muted-foreground, #64748b)" }}>Unassigned</span>}</div>
                </div>
              </div>
            </section>

            <Separator />

            <section style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0, fontWeight: 600 }}>Update Status</h4>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <Select value={status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button onClick={handleStatusUpdate} disabled={!status || isUpdating}>Update Status</Button>
              </div>
            </section>

            <Separator />

            <section style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0, fontWeight: 600 }}>Update Assignment</h4>
            <Separator />
            <section style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0, fontWeight: 600 }}>Update Assignment</h4>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <Select value={assignedDept} onValueChange={(v) => setAssignedDept(v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="water">Water Department</SelectItem>
                    <SelectItem value="roads">Roads Department</SelectItem>
                    <SelectItem value="electricity">Electricity Department</SelectItem>
                    <SelectItem value="sanitation">Sanitation Department</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Assign to supervisor (UID or email)" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
                <Button onClick={handleAssignmentUpdate} disabled={(!assignedDept && !assignedTo) || isUpdating}>Update Assignment</Button>
              </div>
            </section>
            </section>

            <Separator />

            <section style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0, fontWeight: 600 }}>Update Classification</h4>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <Input placeholder="Classification label" value={classification} onChange={(e) => setClassification(e.target.value)} />
                <Textarea placeholder="Classification note (optional)" value={classificationNote} onChange={(e) => setClassificationNote(e.target.value)} />
                <Button onClick={handleClassificationUpdate} disabled={!classification || isUpdating}>Update Classification</Button>
              </div>
            </section>

            <Separator />

            {/* Status History */}
            <section style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0, fontWeight: 600 }}>Status History</h4>
              <div style={{ marginTop: 10, maxHeight: 240, overflowY: "auto", display: "grid", gap: 8 }}>
                {statusHistory.length > 0 ? (
                  statusHistory.map((entry, idx) => {
                    const changedAtDate = toDateSafe(entry.changedAt)
                    const changedAtText = changedAtDate ? format(changedAtDate, "MMM dd, HH:mm") : String(entry.changedAt ?? "—")
                    return (
                      <div key={idx} style={{ padding: 10, background: "var(--muted-bg, #f8fafc)", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 600 }}>
                            {entry.kind === "status" ? "Status changed to" : "Classification updated to"}{" "}
                            <Badge variant="outline" style={{ marginLeft: 8 }}>{entry.status || entry.classification}</Badge>
                          </div>
                          <div style={{ color: "var(--muted-foreground, #64748b)" }}>{changedAtText}</div>
                        </div>
                        {entry.note && <div style={{ marginTop: 6, color: "var(--muted-foreground, #64748b)" }}>{entry.note}</div>}
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>by {entry.changedBy}</div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ color: "var(--muted-foreground, #64748b)" }}>No status history for this report.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
