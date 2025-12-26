"use client";

import { useState } from "react";
import DragDropZone from "@/components/DragDropZone";
import RegionAutocompleteInput from "@/components/RegionAutocompleteInput";
import { submitIntake } from "@/lib/api";
import Toast from "@/components/Toast";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ur", name: "Urdu" },
  { code: "bn", name: "Bengali" },
];

export default function UploadPage() {
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const [pendingFiles, setPendingFiles] = useState([]);

  const handleFilesAccepted = async (fileContents) => {
    // Queue files for analysis instead of analyzing immediately
    setPendingFiles((prev) => [
      ...fileContents.map((file) => {
        const meta = extractMetadata(file.content, file.name);
        return {
          ...file,
          region: "",
          language: meta.language || "en",
        };
      }),
      ...prev,
    ]);
    setToast({
      message: `${fileContents.length} file${fileContents.length > 1 ? "s" : ""} ready for analysis. Please select a region and click Start Analyze.`,
      tone: "success",
    });
  };

  const updateFileRegion = (index, region) => {
    setPendingFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, region } : file))
    );
  };

  const updateFileLanguage = (index, language) => {
    setPendingFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, language } : file))
    );
  };

  const handleAnalyze = async () => {
    if (!pendingFiles.length) return;

    setIsProcessing(true);
    const newResults = [];

    try {
      for (const [index, file] of pendingFiles.entries()) {
        const metadata = extractMetadata(file.content, file.name);

        const text = (metadata.text || file.content || "").slice(0, 5000);
        const language = file.language || metadata.language || "en";
        const source = metadata.source || file.name || "upload";
        const platform = metadata.platform || "email";
        const region = (file.region || metadata.region || "").trim();
        const actorId = metadata.actorId || "";

        if (!text || text.trim().length < 20) {
          newResults.push({
            fileName: file.name,
            status: "error",
            error: "Content too short for analysis (minimum 20 characters).",
          });
          continue;
        }

        if (!region) {
          newResults.push({
            fileName: file.name,
            status: "error",
            error: "Please select a region (city/district) before analyzing.",
          });
          continue;
        }

        const tagsArray = typeof metadata.tags === "string"
          ? metadata.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : Array.isArray(metadata.tags)
          ? metadata.tags
          : undefined;

        const payload = {
          text,
          language,
          source,
          metadata: {
            platform,
            region,
            actor_id: actorId || undefined,
          },
          ...(tagsArray && { tags: tagsArray }),
        };

        try {
          const result = await submitIntake(payload);
          newResults.push({
            ...result,
            fileName: file.name,
            status: "success",
          });

          setToast({
            message: `✓ ${file.name} analyzed successfully`,
            tone: "success",
          });
        } catch (error) {
          newResults.push({
            fileName: file.name,
            status: "error",
            error: error?.response?.data?.detail || error.message || "Failed to analyze file.",
          });

          setToast({
            message: `✗ Failed to analyze ${file.name}`,
            tone: "error",
          });
        }
      }

      setResults((prev) => [...newResults, ...prev]);
    } finally {
      setIsProcessing(false);
      // Clear queue after attempting analysis
      setPendingFiles([]);
    }
  };

  const extractMetadata = (content, fileName) => {
    const metadata = {
      text: content,
      language: "en",
      source: fileName,
      platform: "unknown",
      region: "",
      actorId: "",
      tags: "",
    };

    // Try to detect email format
    if (content.includes("From:") && content.includes("Subject:")) {
      metadata.platform = "email";
      
      // Extract email fields
      const fromMatch = content.match(/From:\s*(.+?)(?:\n|$)/i);
      if (fromMatch) metadata.actorId = fromMatch[1].trim();

      const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/i);
      if (subjectMatch) metadata.source = subjectMatch[1].trim();

      // Extract body (everything after headers)
      const bodyMatch = content.match(/\n\n([\s\S]+)/);
      if (bodyMatch) metadata.text = bodyMatch[1].trim();
    }
    
    // Try to detect social media post format (JSON)
    try {
      const parsed = JSON.parse(content);
      if (parsed.text || parsed.content) {
        metadata.text = parsed.text || parsed.content;
        metadata.platform = parsed.platform || "social";
        metadata.actorId = parsed.author || parsed.user || "";
        metadata.region = parsed.location || "";
        metadata.tags = parsed.hashtags?.join(", ") || "";
      }
    } catch {
      // Not JSON, continue with plain text
    }

    return metadata;
  };

  const getClassificationColor = (classification) => {
    switch (classification?.toLowerCase()) {
      case "malicious":
        return "text-red-400 bg-red-500/10";
      case "suspicious":
        return "text-yellow-400 bg-yellow-500/10";
      case "benign":
        return "text-green-400 bg-green-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload & Analyze Content</h1>
        <p className="mt-2 text-slate-400">
          Drag and drop emails or social media posts for AI-powered analysis
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <div className="space-y-6">
          <DragDropZone
            onFilesAccepted={handleFilesAccepted}
            acceptedFileTypes={{
              "text/plain": [".txt"],
              "text/html": [".html", ".htm"],
              "application/json": [".json"],
              "message/rfc822": [".eml"],
            }}
            maxFiles={10}
            title="Drop Your Files Here"
            description="Supports emails (.eml), text files (.txt), HTML, and JSON social posts"
          />

          {/* Region selection & analyze controls */}
          {pendingFiles.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Pending Files</h3>
                <button
                  onClick={handleAnalyze}
                  disabled={isProcessing}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-2xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? "Analyzing..." : "Start Analyze"}
                </button>
              </div>

              <div className="space-y-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-3 text-xs text-slate-300 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{file.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {(file.size / 1024).toFixed(2)} KB • Set region to enable analysis
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 md:mt-0">
                      <label className="text-[11px] text-slate-400">Language:</label>
                      <select
                        value={file.language || "en"}
                        onChange={(e) => updateFileLanguage(index, e.target.value)}
                        className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                      </select>

                      <label className="text-[11px] text-slate-400">Region:</label>
                      <div className="w-48">
                        <RegionAutocompleteInput
                          value={file.region || ""}
                          onChange={(val) => updateFileRegion(index, val)}
                          placeholder="Start typing city name..."
                          inputClassName="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">Supported Formats</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-300">Email Files (.eml)</p>
                  <p className="text-xs text-slate-500">Standard RFC822 email format with headers</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-300">JSON Social Posts</p>
                  <p className="text-xs text-slate-500">Exported from Twitter, Facebook, etc.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-300">Text/HTML Files</p>
                  <p className="text-xs text-slate-500">Plain text or HTML formatted content</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Analysis Results</h2>
            {results.length > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                {results.length} {results.length === 1 ? "file" : "files"}
              </span>
            )}
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-emerald-400" />
              <span className="text-sm text-slate-400">Analyzing content...</span>
            </div>
          )}

          {results.length === 0 && !isProcessing && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No files analyzed yet</p>
              <p className="mt-1 text-xs text-slate-600">Upload files to see results here</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition-all hover:bg-slate-900/70"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{result.fileName}</h3>
                      {result.status === "success" ? (
                        <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    
                    {result.status === "success" ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Classification:</span>
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${getClassificationColor(result.classification)}`}>
                            {result.classification || "Unknown"}
                          </span>
                        </div>
                        {result.composite_score !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Score:</span>
                            <span className="text-xs font-medium text-slate-300">
                              {(result.composite_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}

                        {(result?.breakdown?.detected_language_name || result?.breakdown?.detected_language) && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Language:</span>
                            <span className="text-xs font-medium text-slate-300">
                              {result.breakdown.detected_language_name || result.breakdown.detected_language}
                            </span>
                          </div>
                        )}
                        {result.intake_id && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">ID:</span>
                            <span className="font-mono text-xs text-slate-400">{result.intake_id}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-red-400">{result.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast.message && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}
