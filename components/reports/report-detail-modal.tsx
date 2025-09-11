"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import type { Report } from "@/lib/types"
import { useReportActions } from "@/hooks/use-report-actions"

interface ReportDetailModalProps {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDetailModal({ report, open, onOpenChange }: ReportDetailModalProps) {
  const [classification, setClassification] = useState("")
  const [classificationNote, setClassificationNote] = useState("")
  const [assignedDept, setAssignedDept] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [status, setStatus] = useState("")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const { updateReportStatus, updateReportAssignment, updateReportClassification } = useReportActions()

  if (!report) return null

  const handleStatusUpdate = async () => {
    if (!status) return

    setIsUpdating(true)
    try {
      await updateReportStatus(report.id, status as any, note)
      setStatus("")
      setNote("")
    } catch (error) {
      console.error("Failed to update status:", error)
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
    } catch (error) {
      console.error("Failed to update assignment:", error)
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
    } catch (error) {
      console.error("Failed to update classification:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Report Details
            <StatusBadge status={report.status} />
          </DialogTitle>
          <DialogDescription>
            Submitted on {format(report.createdAt.toDate(), "MMMM dd, yyyy 'at' HH:mm")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Report Information */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Report Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <IssueTypeBadge issueType={report.issueType} />
                  {report.classification && <Badge variant="secondary">{report.classification}</Badge>}
                </div>

                <div>
                  <Label className="text-sm font-medium">Issue</Label>
                  <p className="text-sm mt-1">{report.issueLabel}</p>
                  {report.customIssue && (
                    <p className="text-sm text-muted-foreground mt-1">Custom: {report.customIssue}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{report.description}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Reporter</Label>
                  <p className="text-sm mt-1">{report.uid}</p>
                </div>
              </div>
            </div>

            {/* Media */}
            {(report.imageUrl || report.audioUrl) && (
              <div>
                <h3 className="font-semibold mb-2">Media</h3>
                <div className="space-y-2">
                  {report.imageUrl && (
                    <div className="space-y-2">
                      <img
                        src={report.imageUrl || "/placeholder.svg"}
                        alt="Report"
                        className="w-full max-w-sm rounded-lg border"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(report.imageUrl!, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open Image
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(report.imageUrl!)}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy URL
                        </Button>
                      </div>
                    </div>
                  )}

                  {report.audioUrl && (
                    <div className="space-y-2">
                      <audio controls className="w-full">
                        <source src={report.audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(report.audioUrl!)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Audio URL
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {report.location && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <p className="text-sm">
                  Lat: {report.location.latitude}, Lng: {report.location.longitude}
                </p>
              </div>
            )}
          </div>

          {/* Admin Actions */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current Assignment</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm">Department</Label>
                  <p className="text-sm mt-1">
                    {report.assignedDept ? (
                      <Badge variant="outline">{report.assignedDept}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm">Assigned To</Label>
                  <p className="text-sm mt-1">
                    {report.assignedTo || <span className="text-muted-foreground">Unassigned</span>}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status Update */}
            <div className="space-y-3">
              <h3 className="font-semibold">Update Status</h3>
              <div className="space-y-2">
                <Select value={status} onValueChange={setStatus}>
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
                <Button onClick={handleStatusUpdate} disabled={!status || isUpdating}>
                  Update Status
                </Button>
              </div>
            </div>

            <Separator />

            {/* Assignment */}
            <div className="space-y-3">
              <h3 className="font-semibold">Update Assignment</h3>
              <div className="space-y-2">
                <Select value={assignedDept} onValueChange={setAssignedDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="water">Water Department</SelectItem>
                    <SelectItem value="roads">Roads Department</SelectItem>
                    <SelectItem value="electricity">Electricity Department</SelectItem>
                    <SelectItem value="sanitation">Sanitation Department</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Assign to supervisor (UID or email)"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                />
                <Button onClick={handleAssignmentUpdate} disabled={(!assignedDept && !assignedTo) || isUpdating}>
                  Update Assignment
                </Button>
              </div>
            </div>

            <Separator />

            {/* Classification */}
            <div className="space-y-3">
              <h3 className="font-semibold">Update Classification</h3>
              <div className="space-y-2">
                <Input
                  placeholder="Classification label"
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                />
                <Textarea
                  placeholder="Classification note (optional)"
                  value={classificationNote}
                  onChange={(e) => setClassificationNote(e.target.value)}
                />
                <Button onClick={handleClassificationUpdate} disabled={!classification || isUpdating}>
                  Update Classification
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Status History */}
        {report.statusHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Status History</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {report.statusHistory.map((entry, index) => (
                <div key={index} className="text-sm p-2 bg-muted rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {entry.kind === "status" ? "Status changed to" : "Classification updated to"}{" "}
                      <Badge variant="outline" className="ml-1">
                        {entry.status || entry.classification}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">{format(entry.changedAt.toDate(), "MMM dd, HH:mm")}</span>
                  </div>
                  {entry.note && <p className="text-muted-foreground mt-1">{entry.note}</p>}
                  <p className="text-muted-foreground text-xs">by {entry.changedBy}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
