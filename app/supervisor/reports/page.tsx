"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SupervisorLayout } from "@/components/layout/supervisor-layout"
import { SupervisorFilters, type SupervisorFilters as FiltersType } from "@/components/supervisor/supervisor-filters"
import { ReportsTable } from "@/components/reports/reports-table"
import { SupervisorReportDetail } from "@/components/supervisor/supervisor-report-detail"
import { useSupervisorReports } from "@/hooks/use-supervisor-reports"
import type { Report } from "@/lib/types"

const initialFilters: FiltersType = {
  status: "",
  dateRange: "",
}

export default function SupervisorReportsPage() {
  const [filters, setFilters] = useState<FiltersType>(initialFilters)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { reports, loading } = useSupervisorReports()
  const searchParams = useSearchParams()

  // Filter reports based on current filters
  const filteredReports = reports.filter((report) => {
    if (filters.status && filters.status !== "all" && report.status !== filters.status) {
      return false
    }

    if (filters.dateRange && filters.dateRange !== "all") {
      const now = new Date()
      const reportDate = report.createdAt.toDate()

      switch (filters.dateRange) {
        case "today":
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (reportDate < todayStart) return false
          break
        case "week":
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (reportDate < weekStart) return false
          break
        case "month":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          if (reportDate < monthStart) return false
          break
      }
    }

    return true
  })

  // Handle URL filter parameters
  useEffect(() => {
    const urlFilter = searchParams.get("filter")
    if (urlFilter) {
      switch (urlFilter) {
        case "pending":
          setFilters((prev) => ({ ...prev, status: "submitted" }))
          break
        case "overdue":
          // For overdue, we'll show all non-resolved reports
          // The overdue logic is handled in the stats calculation
          setFilters((prev) => ({ ...prev, status: "submitted" }))
          break
      }
    }
  }, [searchParams])

  const handleViewReport = (report: Report) => {
    setSelectedReport(report)
    setIsModalOpen(true)
  }

  const handleClearFilters = () => {
    setFilters(initialFilters)
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Reports</h1>
          <p className="text-muted-foreground">
            Reports assigned to your department. Total: {filteredReports.length} of {reports.length}
          </p>
        </div>

        <SupervisorFilters filters={filters} onFiltersChange={setFilters} onClearFilters={handleClearFilters} />

        <ReportsTable reports={filteredReports} onViewReport={handleViewReport} loading={loading} />

        <SupervisorReportDetail report={selectedReport} open={isModalOpen} onOpenChange={setIsModalOpen} />
      </div>
    </SupervisorLayout>
  )
}
