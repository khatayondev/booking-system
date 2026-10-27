"use client";

import * as React from "react";
import {
  Sparkles,
  Search,
  MoreVertical,
  Scissors,
  Pin,
  Edit2,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Dialog, Drawer, ContextMenuPopover } from "@/components/ui/dialog-and-drawer";
import { Checklist, DashedAddCard } from "@/components/ui/checklist-and-add-card";
import {
  CircularProgressRing,
  DonutRing,
  LineChart,
  type ChartDataPoint,
} from "@/components/ui/charts";
import {
  Skeleton,
  EmptyState,
  Label,
  Input,
  Textarea,
  ViewToggle,
  SortDropdown,
  DateTimePicker,
  Toast,
} from "@/components/ui/controls";

export default function DesignSystemPage() {
  // Interactive state
  const [activeTab, setActiveTab] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = React.useState("recent");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [showToast, setShowToast] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState("2026-10-28");
  const [selectedTime, setSelectedTime] = React.useState("10:00 AM");

  const [checklistItems, setChecklistItems] = React.useState([
    { id: "1", label: "Sterilize Lash Extensions kit", subtitle: "Assigned to Adjoa", completed: true },
    { id: "2", label: "Prepare Hair Wash Basin & Products", subtitle: "Morning prep", completed: false },
    { id: "3", label: "Restock HD Makeup Palettes", subtitle: "Inventory check", completed: false },
  ]);

  const toggleChecklist = (id: string) => {
    setChecklistItems((items) =>
      items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // Sample Chart Data
  const chartData: ChartDataPoint[] = [
    { day: "Mon", current: 320, previous: 280 },
    { day: "Tue", current: 450, previous: 380 },
    { day: "Wed", current: 580, previous: 500, isActive: true },
    { day: "Thu", current: 510, previous: 490 },
    { day: "Fri", current: 780, previous: 650 },
    { day: "Sat", current: 950, previous: 890 },
    { day: "Sun", current: 620, previous: 590 },
  ];

  const donutData = [
    { label: "Hair & Braids", value: 45, color: "#1E1E1E" },
    { label: "Makeup & Glam", value: 30, color: "#52525B" },
    { label: "Lash Tech", value: 15, color: "#A1A1AA" },
    { label: "Dress Rental", value: 10, color: "#E4E4E7" },
  ];

  return (
    <AppShell activePath="/design" userName="Akosua">
      <div className="space-y-10 pb-16">
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1E1E]">
              Design System & Component Library
            </h1>
            <p className="text-xs sm:text-sm text-[#71717A] mt-1">
              Strictly monochrome palette with subtle status chip accents, 24–28px card radii, and frosted glass frames.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle view={viewMode} onChange={setViewMode} />
            <SortDropdown
              options={[
                { id: "recent", label: "Most Recent" },
                { id: "popular", label: "Most Popular" },
                { id: "price", label: "Price: High to Low" },
              ]}
              selected={sortBy}
              onSelect={setSortBy}
            />
          </div>
        </div>

        {/* 1. BUTTONS */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            1. Buttons & Controls
          </h2>
          <Card variant="white">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="blackPill" size="md">
                Black Pill Button
              </Button>
              <Button variant="outlinePill" size="md">
                Outline Pill Button
              </Button>
              <Button variant="circularIcon" size="icon" aria-label="Search icon">
                <Search className="w-4 h-4 text-[#71717A]" />
              </Button>
              <Button variant="circularIconDark" size="icon" aria-label="Sparkles icon">
                <Sparkles className="w-4 h-4 text-white" />
              </Button>
              <Button variant="ghost" size="sm">
                Ghost Action
              </Button>
              <Button variant="blackPill" size="sm" disabled>
                Disabled Pill
              </Button>
            </div>
          </Card>
        </section>

        {/* 2. STATUS CHIPS */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            2. Status Chips (Subtle Tints)
          </h2>
          <Card variant="white">
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status="green" label="Confirmed (GH₵ 450.00)" />
              <StatusChip status="green" label="Paid in Full" />
              <StatusChip status="amber" label="Pending Payment" />
              <StatusChip status="amber" label="Slot Held (8m left)" />
              <StatusChip status="red" label="Cancelled by Client" />
              <StatusChip status="red" label="Payment Failed" />
              <StatusChip status="grey" label="No Show / Completed" />
              <StatusChip status="grey" label="Archived" dot={false} />
            </div>
          </Card>
        </section>

        {/* 3. CARDS VARIATIONS */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            3. Card Variants (24–28px Radius)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Frosted Glass Card</CardTitle>
                <CardDescription>backdrop-filter blur with subtle white border</CardDescription>
              </CardHeader>
              <p className="text-xs text-[#71717A] leading-relaxed">
                Used across overview surfaces and secondary widgets. Seamlessly merges with the soft swirl background.
              </p>
            </Card>

            <Card variant="dark">
              <CardHeader>
                <CardTitle className="text-white">Solid Near-Black Card</CardTitle>
                <CardDescription className="text-white/60">#1E1E1E with high contrast typography</CardDescription>
              </CardHeader>
              <p className="text-xs text-white/80 leading-relaxed">
                Highlights primary revenue metrics, POS checkout carts, and executive actions with premium visual weight.
              </p>
            </Card>

            <Card variant="white">
              <CardHeader>
                <CardTitle>Solid White Card</CardTitle>
                <CardDescription>1px soft-grey border with subtle elevation</CardDescription>
              </CardHeader>
              <p className="text-xs text-[#71717A] leading-relaxed">
                Standard container for data grids, lists, form panels, and appointment booking steps.
              </p>
            </Card>
          </div>
        </section>

        {/* 4. KPI CARDS WITH MINI STAT TILES */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            4. KPI Cards with Mini Stat Tiles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard
              title="Daily Revenue"
              value="GH₵ 12,480.00"
              subtitle="Accra Studio POS & Online"
              trend={{ direction: "up", value: "14.2% vs yesterday" }}
              miniStats={[
                { label: "Hair", value: "GH₵ 5.2k" },
                { label: "Makeup", value: "GH₵ 3.8k" },
                { label: "Lashes", value: "GH₵ 2.1k" },
                { label: "Dresses", value: "GH₵ 1.3k" },
              ]}
              variant="dark"
            />
            <KpiCard
              title="Today's Appointments"
              value="38 Bookings"
              subtitle="34 Checked In, 4 Remaining"
              trend={{ direction: "up", value: "8 new" }}
              miniStats={[
                { label: "Hair", value: 14 },
                { label: "Makeup", value: 12 },
                { label: "Lashes", value: 8 },
                { label: "Fitting", value: 4 },
              ]}
              variant="white"
            />
            <KpiCard
              title="Average Order Value"
              value="GH₵ 328.50"
              subtitle="Higher addon attachment rate"
              trend={{ direction: "up", value: "+5.1%" }}
              miniStats={[
                { label: "Card", value: "48%" },
                { label: "MoMo", value: "44%" },
                { label: "Cash", value: "8%" },
                { label: "Deposit", value: "100%" },
              ]}
              variant="glass"
            />
          </div>
        </section>

        {/* 5. CHARTS & METRICS */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            5. Charts: Thin Black Line & Category Donut
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card variant="white" className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1E1E1E]">Weekly Appointments Trend</h3>
                  <p className="text-xs text-[#71717A]">Comparing current week to previous week</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#1E1E1E] rounded-full" />
                    <span className="font-medium text-[#1E1E1E]">This Week</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-[#D4D4D8] border border-dashed" />
                    <span className="text-[#71717A]">Last Week</span>
                  </div>
                </div>
              </div>
              <LineChart data={chartData} height={230} />
            </Card>

            <Card variant="white" className="flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1E1E1E] mb-1">Service Breakdown</h3>
                <p className="text-xs text-[#71717A] mb-4">Share of total monthly bookings</p>
                <DonutRing data={donutData} />
              </div>
              <div className="pt-6 border-t border-[#F4F4F6] flex items-center justify-between">
                <span className="text-xs text-[#71717A]">Capacity Utilization</span>
                <CircularProgressRing progress={86} size={64} strokeWidth={6} label="86%" />
              </div>
            </Card>
          </div>
        </section>

        {/* 6. TABS & TABLE */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              6. Tabs & Data Table
            </h2>
            <Tabs
              tabs={[
                { id: "all", label: "All Bookings", badge: 42 },
                { id: "confirmed", label: "Confirmed", badge: 34 },
                { id: "pending", label: "Pending", badge: 5 },
                { id: "cancelled", label: "Cancelled", badge: 3 },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Time (Accra)</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">
                  <div>Efua Mensah</div>
                  <div className="text-xs text-[#71717A]">+233 24 111 2233</div>
                </TableCell>
                <TableCell>Goddess Knotless Braids</TableCell>
                <TableCell>Yaa Asantewaa</TableCell>
                <TableCell>10:00 AM – 12:30 PM</TableCell>
                <TableCell className="font-bold">GH₵ 350.00</TableCell>
                <TableCell>
                  <StatusChip status="green" label="Confirmed" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="relative inline-block">
                    <Button
                      variant="circularIcon"
                      size="iconSm"
                      onClick={() => setContextMenuOpen(!contextMenuOpen)}
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-[#71717A]" />
                    </Button>
                    <ContextMenuPopover
                      isOpen={contextMenuOpen}
                      onClose={() => setContextMenuOpen(false)}
                      items={[
                        { label: "Pin Appointment", icon: <Pin className="w-3 h-3" />, onClick: () => {} },
                        { label: "Edit Booking", icon: <Edit2 className="w-3 h-3" />, onClick: () => setDialogOpen(true) },
                        { label: "Cancel & Refund", icon: <Trash2 className="w-3 h-3" />, danger: true, onClick: () => {} },
                      ]}
                    />
                  </div>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-semibold">
                  <div>Serwaa Boateng</div>
                  <div className="text-xs text-[#71717A]">+233 50 998 7766</div>
                </TableCell>
                <TableCell>Bridal Glam Makeup</TableCell>
                <TableCell>Akosua Addo</TableCell>
                <TableCell>02:00 PM – 03:30 PM</TableCell>
                <TableCell className="font-bold">GH₵ 600.00</TableCell>
                <TableCell>
                  <StatusChip status="amber" label="Pending Payment" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outlinePill" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-semibold">
                  <div>Abena Osei</div>
                  <div className="text-xs text-[#71717A]">+233 20 445 6677</div>
                </TableCell>
                <TableCell>Hybrid Lash Full Set</TableCell>
                <TableCell>Jessica Kyei</TableCell>
                <TableCell>04:00 PM – 05:15 PM</TableCell>
                <TableCell className="font-bold">GH₵ 280.00</TableCell>
                <TableCell>
                  <StatusChip status="green" label="Paid in Full" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outlinePill" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* 7. CHECKLIST & DASHED ADD CARD */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            7. Daily Checklist &amp; Dashed &apos;Add&apos; Card
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="white">
              <h3 className="text-sm font-bold text-[#1E1E1E] mb-3">Daily Station Readiness</h3>
              <Checklist items={checklistItems} onToggle={toggleChecklist} />
            </Card>

            <DashedAddCard
              label="Add New Service or Category"
              description="Define pricing in pesewas, duration, buffer time, and deposit policy."
              onClick={() => setDialogOpen(true)}
            />
          </div>
        </section>

        {/* 8. FORM CONTROLS & DATE/TIME PICKER */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            8. Form Inputs & Date/Time Slot Picker
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="white" className="space-y-4">
              <h3 className="text-sm font-bold text-[#1E1E1E]">Input Fields</h3>
              <div>
                <Label>Service Name</Label>
                <Input placeholder="e.g. Signature Bridal Soft Glam" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (GH₵)</Label>
                  <Input type="number" placeholder="550.00" />
                </div>
                <div>
                  <Label>Duration (Minutes)</Label>
                  <Input type="number" placeholder="90" />
                </div>
              </div>
              <div>
                <Label>Notes & Preparation Advice</Label>
                <Textarea placeholder="Client instructions, skin preparation, hair washing..." />
              </div>
            </Card>

            <Card variant="white">
              <h3 className="text-sm font-bold text-[#1E1E1E] mb-4">Date & Accra Slot Picker</h3>
              <DateTimePicker
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onDateChange={setSelectedDate}
                onTimeChange={setSelectedTime}
              />
            </Card>
          </div>
        </section>

        {/* 9. MODALS, TOAST, SKELETON & EMPTY STATE */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            9. Dialog, Drawer, Toast, Skeleton & Empty State
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="white" className="space-y-4">
              <h3 className="text-sm font-bold text-[#1E1E1E]">Interactive Overlays</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="blackPill" size="sm" onClick={() => setDialogOpen(true)}>
                  Trigger Dialog Modal
                </Button>
                <Button variant="outlinePill" size="sm" onClick={() => setDrawerOpen(true)}>
                  Trigger Mobile/Slide Drawer
                </Button>
              </div>

              {showToast && (
                <div className="pt-4 border-t border-[#F4F4F6]">
                  <Toast
                    title="Deposit Received"
                    message="GH₵ 150.00 confirmed via MTN Mobile Money (+233 24 111 2233)."
                    onClose={() => setShowToast(false)}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-[#F4F4F6] space-y-2">
                <p className="text-xs font-semibold text-[#71717A]">Skeleton Placeholders</p>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-10 w-24 rounded-full" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                </div>
              </div>
            </Card>

            <EmptyState
              icon={<Scissors className="w-6 h-6 text-[#71717A]" />}
              title="No Dress Rentals Found"
              description="You have not added any evening gowns or bridal dresses to the rental directory yet."
              actionLabel="Add First Dress"
              onAction={() => setDialogOpen(true)}
            />
          </div>
        </section>
      </div>

      {/* Dialog Modal */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add New Service"
        description="Create a beauty or dress service with server-validated pricing in pesewas."
        footer={
          <>
            <Button variant="outlinePill" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="blackPill" size="sm" onClick={() => setDialogOpen(false)}>
              Save Service
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Service Name</Label>
            <Input placeholder="e.g. Deluxe Gel Pedicure" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input placeholder="Hair / Makeup / Lashes" />
            </div>
            <div>
              <Label>Price (GH₵)</Label>
              <Input type="number" placeholder="250.00" />
            </div>
          </div>
        </div>
      </Dialog>

      {/* Slide Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Quick Appointment Summary"
        side="right"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#F4F4F6]">
            <p className="text-xs font-bold text-[#1E1E1E]">Efua Mensah</p>
            <p className="text-xs text-[#71717A]">+233 24 111 2233</p>
            <p className="text-xs font-semibold mt-2 text-[#1E1E1E]">Goddess Knotless Braids</p>
            <p className="text-xs text-[#71717A]">Sat, 28 Oct 2026 @ 10:00 AM</p>
          </div>
          <div className="flex justify-between items-center text-xs font-bold py-2 border-t border-[#F4F4F6]">
            <span>Total Payable:</span>
            <span>GH₵ 350.00</span>
          </div>
          <Button variant="blackPill" size="md" className="w-full" onClick={() => setDrawerOpen(false)}>
            Proceed to POS Checkout
          </Button>
        </div>
      </Drawer>
    </AppShell>
  );
}
