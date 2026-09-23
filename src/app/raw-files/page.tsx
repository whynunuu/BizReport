"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FolderGit2,
  Camera,
  Sparkles,
  Clock,
  Flame,
  Download,
  ExternalLink,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Send,
  Copy,
  FileText,
  FileCode,
  Trash2,
  AlertCircle,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Share2,
  Calendar,
  X,
  Check,
} from "lucide-react";

interface PhotoJob {
  id: string;
  clientName: string;
  phoneNumber: string;
  packageType: string;
  sessionDate: string;
  driveUrl: string | null;
  fileCount: number;
  priority: "KILAT_24H" | "HIGH_PRIORITY" | "NORMAL";
  status:
    | "WAITING_UPLOAD"
    | "RAW_READY"
    | "EDITING"
    | "READY_TO_SEND"
    | "DELIVERED";
  deadline: string | null;
  notes: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface RawLeadItem {
  leadId: string;
  phoneNumber: string;
  name: string;
  status: string;
  source: string;
  priorityRanking: string;
  maxUrgencyScore: number;
  isHighPriority: boolean;
  needsFollowUp: boolean;
  hasBooking: boolean;
  contextNotes: string;
  latestMessage: string;
  aiSummary: string;
  recommendedReply: string;
  latestIntent: string;
  sentiment: string;
  totalInteractions: number;
  allInteractionsRaw: any[];
  lastUpdatedAt: string;
}

export default function RawFilesHubPage() {
  const [activeTab, setActiveTab] = useState<"photos" | "crm">("photos");

  // State untuk Tab 1: Studio Photo RAW Delivery
  const [photoJobs, setPhotoJobs] = useState<PhotoJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobSearch, setJobSearch] = useState("");
  const [jobPriorityFilter, setJobPriorityFilter] = useState("ALL");
  const [jobStatusFilter, setJobStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState<PhotoJob | null>(null);

  // Form State untuk tambah / edit Job
  const [formClientName, setFormClientName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPackage, setFormPackage] = useState("Photofox");
  const [formDriveUrl, setFormDriveUrl] = useState("");
  const [formFileCount, setFormFileCount] = useState<number>(50);
  const [formPriority, setFormPriority] = useState<
    "KILAT_24H" | "HIGH_PRIORITY" | "NORMAL"
  >("NORMAL");
  const [formStatus, setFormStatus] = useState<
    "WAITING_UPLOAD" | "RAW_READY" | "EDITING" | "READY_TO_SEND" | "DELIVERED"
  >("RAW_READY");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Tab 2: WhatsApp CRM Raw Leads
  const [crmLeads, setCrmLeads] = useState<RawLeadItem[]>([]);
  const [isLoadingCrm, setIsLoadingCrm] = useState(true);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmPriorityFilter, setCrmPriorityFilter] = useState("ALL");
  const [selectedRawItem, setSelectedRawItem] = useState<RawLeadItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Photo Jobs
  const fetchPhotoJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const res = await fetch("/api/raw-files/jobs");
      const data = await res.json();
      if (data.success) {
        setPhotoJobs(data.data || []);
      }
    } catch (err) {
      console.error("Gagal load photo jobs:", err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Fetch CRM Raw Leads
  const fetchCrmRawLeads = async () => {
    try {
      setIsLoadingCrm(true);
      const res = await fetch("/api/crm/raw");
      const data = await res.json();
      if (data.data) {
        setCrmLeads(data.data || []);
      }
    } catch (err) {
      console.error("Gagal load crm raw leads:", err);
    } finally {
      setIsLoadingCrm(false);
    }
  };

  useEffect(() => {
    fetchPhotoJobs();
    fetchCrmRawLeads();

    // Auto-sync real-time tiap 10 detik tanpa perlu reload manual
    const interval = setInterval(() => {
      fetchPhotoJobs();
      fetchCrmRawLeads();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handler Submit Job Baru
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName || !formPhone) {
      alert("Nama klien dan No. WhatsApp wajib diisi!");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/raw-files/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: formClientName,
          phoneNumber: formPhone,
          packageType: formPackage,
          driveUrl: formDriveUrl,
          fileCount: formFileCount,
          priority: formPriority,
          status: formStatus,
          notes: formNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        resetForm();
        fetchPhotoJobs();
      } else {
        alert(data.error || "Gagal menyimpan");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Update Status Job
  const handleUpdateStatus = async (
    id: string,
    newStatus: string,
    markDelivered = false
  ) => {
    try {
      const res = await fetch("/api/raw-files/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus, markDelivered }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPhotoJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler Delete Job
  const handleDeleteJob = async (id: string) => {
    if (!confirm("Hapus antrean file foto ini?")) return;
    try {
      const res = await fetch(`/api/raw-files/jobs?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchPhotoJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormClientName("");
    setFormPhone("");
    setFormPackage("Photofox");
    setFormDriveUrl("");
    setFormFileCount(50);
    setFormPriority("NORMAL");
    setFormStatus("RAW_READY");
    setFormNotes("");
    setIsEditingJob(null);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format WA Link
  const createWhatsAppLink = (job: PhotoJob) => {
    const cleanPhone = job.phoneNumber.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "62" + cleanPhone.slice(1)
      : cleanPhone;

    const message = `Halo Kak ${job.clientName}! 👋\n\nTerima kasih sudah photoshoot di Foxe Studio (Paket ${job.packageType}).\n\nFile foto mentah / hasil sesi foto kakak sudah siap diakses melalui Google Drive berikut ya:\n🔗 ${job.driveUrl || "[Link Drive Sedang Diproses]"}\n\nSilakan di-download dan kabari kami jika sudah selesai ya kak. Have a great day! ✨📸`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
      message
    )}`;
  };

  // Filtered Photo Jobs
  const filteredPhotoJobs = useMemo(() => {
    return photoJobs.filter((job) => {
      const matchesSearch =
        job.clientName.toLowerCase().includes(jobSearch.toLowerCase()) ||
        job.phoneNumber.includes(jobSearch) ||
        job.packageType.toLowerCase().includes(jobSearch.toLowerCase());
      const matchesPriority =
        jobPriorityFilter === "ALL" || job.priority === jobPriorityFilter;
      const matchesStatus =
        jobStatusFilter === "ALL" || job.status === jobStatusFilter;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [photoJobs, jobSearch, jobPriorityFilter, jobStatusFilter]);

  // Filtered CRM Leads
  const filteredCrmLeads = useMemo(() => {
    return crmLeads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(crmSearch.toLowerCase()) ||
        lead.phoneNumber.includes(crmSearch) ||
        lead.latestMessage.toLowerCase().includes(crmSearch.toLowerCase());
      const matchesPriority =
        crmPriorityFilter === "ALL" ||
        (crmPriorityFilter === "URGENT" && lead.isHighPriority) ||
        (crmPriorityFilter === "5" && lead.maxUrgencyScore === 5) ||
        (crmPriorityFilter === "4" && lead.maxUrgencyScore === 4) ||
        (crmPriorityFilter === "LOW" && lead.maxUrgencyScore <= 3);
      return matchesSearch && matchesPriority;
    });
  }, [crmLeads, crmSearch, crmPriorityFilter]);

  // Statistik Ringkas
  const photoStats = useMemo(() => {
    return {
      total: photoJobs.length,
      kilat: photoJobs.filter((j) => j.priority === "KILAT_24H").length,
      editing: photoJobs.filter((j) => j.status === "EDITING").length,
      readyToSend: photoJobs.filter((j) => j.status === "READY_TO_SEND").length,
      delivered: photoJobs.filter((j) => j.status === "DELIVERED").length,
    };
  }, [photoJobs]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200/60">
            <FolderGit2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Pusat File Mentah & Antrean Prioritas</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Raw Files & Priority Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola link Google Drive file mentah sesi foto studio & pantau data
            mentah leads CRM terprioritas.
          </p>
        </div>

        {/* Global Export & Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/crm/raw?format=json"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Download Raw JSON"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span>Raw JSON</span>
          </a>

          <a
            href="/api/crm/raw?format=csv"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200/60"
            title="Download Spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor CSV</span>
          </a>

          <button
            onClick={() => {
              fetchPhotoJobs();
              fetchCrmRawLeads();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoadingJobs || isLoadingCrm ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {photoStats.total}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Antrean Foto
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {photoStats.kilat}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Prioritas Kilat 24 Jam
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-600">
              {photoStats.editing}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Proses Retouch / Edit
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {photoStats.delivered}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Terkirim ke Klien
            </div>
          </div>
        </div>
      </div>

      {/* DUAL-TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 bg-white px-3 pt-3 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab("photos")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "photos"
              ? "border-orange-500 text-orange-600 bg-orange-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Antrean File Foto Mentah Studio</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-bold ml-1">
            {photoJobs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("crm")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "crm"
              ? "border-blue-500 text-blue-600 bg-blue-50/40 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Data Mentah AI CRM & Prioritas Leads</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-bold ml-1">
            {crmLeads.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: STUDIO PHOTO RAW FILES & DELIVERY QUEUE                */}
      {/* ============================================================== */}
      {activeTab === "photos" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama klien, no WA, atau paket..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Priority Filter */}
              <select
                value={jobPriorityFilter}
                onChange={(e) => setJobPriorityFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-700"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="KILAT_24H">⚡ Kilat 24 Jam</option>
                <option value="HIGH_PRIORITY">🔥 Prioritas Tinggi</option>
                <option value="NORMAL">🟢 Standar</option>
              </select>

              {/* Status Filter */}
              <select
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-700"
              >
                <option value="ALL">Semua Status</option>
                <option value="RAW_READY">Raw Siap di Drive</option>
                <option value="EDITING">Sedang Edit</option>
                <option value="READY_TO_SEND">Siap Kirim</option>
                <option value="DELIVERED">Selesai (Terkirim)</option>
              </select>
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Input Antrean Foto Baru</span>
            </button>
          </div>

          {/* Jobs List */}
          {isLoadingJobs ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-sm">Memuat antrean file mentah...</p>
            </div>
          ) : filteredPhotoJobs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <FolderGit2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">
                Belum Ada Antrean File Foto
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Klik tombol di bawah untuk mencatat sesi foto baru dan menautkan
                link Google Drive file mentah.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Antrean Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPhotoJobs.map((job) => {
                const isKilat = job.priority === "KILAT_24H";
                const isHigh = job.priority === "HIGH_PRIORITY";
                const isDelivered = job.status === "DELIVERED";

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs ${
                      isKilat
                        ? "border-red-300 ring-2 ring-red-100"
                        : isHigh
                        ? "border-amber-300"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isKilat && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200 animate-pulse">
                              <Flame className="w-3 h-3" />
                              <span>⚡ KILAT 24 JAM</span>
                            </span>
                          )}
                          {isHigh && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              🔥 PRIORITAS TINGGI
                            </span>
                          )}
                          {!isKilat && !isHigh && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              STANDAR
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-700">
                            {job.packageType}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {job.status === "DELIVERED" && (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Selesai Terkirim</span>
                            </span>
                          )}
                          {job.status === "READY_TO_SEND" && (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Siap Dikirim
                            </span>
                          )}
                          {job.status === "EDITING" && (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              Proses Edit
                            </span>
                          )}
                          {job.status === "RAW_READY" && (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Raw Siap di Drive
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Client Info */}
                      <div className="mb-3">
                        <h3 className="text-base font-bold text-slate-900">
                          {job.clientName}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {job.phoneNumber}
                        </p>
                      </div>

                      {/* Retouch Notes */}
                      {job.notes && (
                        <div className="p-2.5 mb-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">
                            Catatan Edit:{" "}
                          </span>
                          {job.notes}
                        </div>
                      )}

                      {/* Google Drive Link Box */}
                      <div className="mb-4">
                        {job.driveUrl ? (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <FolderGit2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="text-xs font-mono text-blue-700 truncate">
                                {job.driveUrl}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() =>
                                  handleCopy(job.driveUrl!, job.id)
                                }
                                className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600"
                                title="Salin Link"
                              >
                                {copiedId === job.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={job.driveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600"
                                title="Buka Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic flex items-center justify-between">
                            <span>Link Google Drive belum dimasukkan</span>
                            <button
                              onClick={() => {
                                const url = prompt(
                                  "Tempel Link Google Drive untuk " +
                                    job.clientName +
                                    ":"
                                );
                                if (url) {
                                  fetch("/api/raw-files/jobs", {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      id: job.id,
                                      driveUrl: url,
                                    }),
                                  }).then(() => fetchPhotoJobs());
                                }
                              }}
                              className="text-xs font-semibold text-orange-600 hover:underline"
                            >
                              + Tempel Link
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status & WhatsApp Action */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      {/* Status Dropdown */}
                      <select
                        value={job.status}
                        onChange={(e) =>
                          handleUpdateStatus(
                            job.id,
                            e.target.value,
                            e.target.value === "DELIVERED"
                          )
                        }
                        className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none"
                      >
                        <option value="RAW_READY">Raw Siap di Drive</option>
                        <option value="EDITING">Sedang Proses Edit</option>
                        <option value="READY_TO_SEND">Siap Kirim Klien</option>
                        <option value="DELIVERED">Selesai (Terkirim)</option>
                      </select>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={createWhatsAppLink(job)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            if (!isDelivered) {
                              handleUpdateStatus(job.id, "DELIVERED", true);
                            }
                          }}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim via WA</span>
                        </a>

                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: WHATSAPP CRM RAW DATA & AI PRIORITY EXPLORER          */}
      {/* ============================================================== */}
      {activeTab === "crm" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari pesan, nama, no HP..."
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={crmPriorityFilter}
                onChange={(e) => setCrmPriorityFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-700"
              >
                <option value="ALL">Semua Urgensi</option>
                <option value="URGENT">⚡ Urgent Flag</option>
                <option value="5">Skor 5/5 (Mendesak)</option>
                <option value="4">Skor 4/5 (Tinggi)</option>
                <option value="LOW">Skor 1-3 (Normal)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan <b>{filteredCrmLeads.length}</b> pesan mentah
              </span>
            </div>
          </div>

          {/* CRM Leads Table */}
          {isLoadingCrm ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-sm">Memuat data mentah CRM...</p>
            </div>
          ) : filteredCrmLeads.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm">Tidak ada pesan WhatsApp mentah yang cocok.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Prioritas & Urgensi</th>
                      <th className="py-3.5 px-4">Pelanggan</th>
                      <th className="py-3.5 px-4">Pesan Masuk Terakhir</th>
                      <th className="py-3.5 px-4">Analisis AI & Draf</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCrmLeads.map((item, idx) => (
                      <tr
                        key={item.leadId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          item.isHighPriority ? "bg-red-50/20" : ""
                        }`}
                      >
                        {/* Priority Badge & Urgency */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-col gap-1 items-start">
                            {item.isHighPriority ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-red-100 text-red-700 border border-red-200">
                                <Flame className="w-3 h-3 text-red-600" />
                                <span>URGENT #1</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-slate-100 text-slate-600">
                                LEVEL {item.maxUrgencyScore}
                              </span>
                            )}

                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">
                                {item.maxUrgencyScore}/5
                              </span>
                              <span className="text-2xs text-slate-400">
                                urgensi
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {item.phoneNumber}
                          </div>
                          {item.sentiment && (
                            <span
                              className={`inline-block mt-1 text-2xs px-1.5 py-0.5 rounded font-medium ${
                                item.sentiment === "POSITIF"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.sentiment === "NEGATIF"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              Sentimen: {item.sentiment}
                            </span>
                          )}
                        </td>

                        {/* Latest Message */}
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <p className="text-xs text-slate-700 line-clamp-3 bg-slate-50 p-2 rounded-lg border border-slate-100 font-normal">
                            &ldquo;{item.latestMessage || "—"}&rdquo;
                          </p>
                          <div className="text-2xs text-slate-400 mt-1">
                            {new Date(item.lastUpdatedAt).toLocaleString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </td>

                        {/* AI Summary & Reply */}
                        <td className="py-3.5 px-4 align-top max-w-sm">
                          <div className="text-xs text-slate-800 font-medium mb-1">
                            {item.aiSummary || "Analisis AI tersedia"}
                          </div>
                          {item.recommendedReply && (
                            <div className="text-2xs text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-start gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {item.recommendedReply}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedRawItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                              title="Lihat Raw JSON"
                            >
                              <FileCode className="w-3.5 h-3.5 text-slate-500" />
                              <span>Inspect</span>
                            </button>

                            {item.recommendedReply && (
                              <button
                                onClick={() =>
                                  handleCopy(
                                    item.recommendedReply,
                                    `reply-${item.leadId}`
                                  )
                                }
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Salin Draf AI"
                              >
                                {copiedId === `reply-${item.leadId}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TAMBAH ANTREAN FOTO BARU                             */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Input Antrean File Foto Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Catat sesi photoshoot & tautkan Google Drive raw files
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Klien / Pemesan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Amanda & Fajar"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    No WhatsApp Klien *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08123456789"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Paket Studio
                  </label>
                  <select
                    value={formPackage}
                    onChange={(e) => setFormPackage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Photofox">Photofox (Rp 200rb)</option>
                    <option value="Graduation">Graduation (Rp 350rb)</option>
                    <option value="Graduation Premium">
                      Graduation Premium (Rp 500rb)
                    </option>
                    <option value="Large Group">
                      Large Group (Rp 25rb/pax)
                    </option>
                    <option value="Family A">Family A (Rp 350rb)</option>
                    <option value="Couple A">Couple A (Rp 150rb)</option>
                    <option value="Pas Foto">Pas Foto (Rp 50rb)</option>
                    <option value="Single">Single (Rp 100rb)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tingkat Prioritas Delivery
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(
                        e.target.value as
                          | "KILAT_24H"
                          | "HIGH_PRIORITY"
                          | "NORMAL"
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="NORMAL">🟢 Standar (3-5 Hari)</option>
                    <option value="HIGH_PRIORITY">
                      🔥 Prioritas Tinggi (Wisuda/Event)
                    </option>
                    <option value="KILAT_24H">⚡ Kilat 24 Jam (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Link Google Drive (Folder RAW / Hasil Foto)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={formDriveUrl}
                  onChange={(e) => setFormDriveUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono text-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Status Pengerjaan
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(
                        e.target.value as
                          | "WAITING_UPLOAD"
                          | "RAW_READY"
                          | "EDITING"
                          | "READY_TO_SEND"
                          | "DELIVERED"
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="RAW_READY">Raw Siap di Drive</option>
                    <option value="EDITING">Sedang Edit / Retouch</option>
                    <option value="READY_TO_SEND">Siap Kirim ke Klien</option>
                    <option value="DELIVERED">Selesai (Terkirim)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Estimasi Jumlah Foto
                  </label>
                  <input
                    type="number"
                    value={formFileCount}
                    onChange={(e) => setFormFileCount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Catatan Retouch / Permintaan Klien
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Tone agak warm, skin smoothing natural, jangan dicrop terlalu dekat."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-white bg-orange-500 hover:bg-orange-600 font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Antrean"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: RAW JSON INSPECTOR                                    */}
      {/* ============================================================== */}
      {selectedRawItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Raw JSON Lead Inspector
                  </h3>
                  <p className="text-2xs text-slate-500 font-mono">
                    ID: {selectedRawItem.leadId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRawItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick summary header */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-2xs">Prioritas</span>
                <span className="font-bold text-slate-800">
                  {selectedRawItem.priorityRanking}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Urgensi</span>
                <span className="font-bold text-slate-800">
                  {selectedRawItem.maxUrgencyScore} / 5
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">Sentimen</span>
                <span className="font-bold text-slate-800">
                  {selectedRawItem.sentiment || "NETRAL"}
                </span>
              </div>
            </div>

            {/* Code container */}
            <div className="flex-1 overflow-auto bg-slate-900 text-emerald-400 font-mono text-2xs p-4 rounded-2xl">
              <pre>{JSON.stringify(selectedRawItem, null, 2)}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-2xs text-slate-400">
                Pesan & Analisis Gemini AI
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(selectedRawItem, null, 2),
                      "json-modal"
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  {copiedId === "json-modal" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin JSON</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedRawItem(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
