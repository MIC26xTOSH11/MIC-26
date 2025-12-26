"use client";

import { useState } from "react";
import DragDropZone from "@/components/DragDropZone";
import { submitIntake } from "@/lib/api";
import Toast from "@/components/Toast";

export default function UploadPage() {
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "success" });

  const handleFilesAccepted = async (fileContents) => {
    setIsProcessing(true);
    const newResults = [];

    try {
      for (const file of fileContents) {
        // Extract metadata from file content
        const metadata = extractMetadata(file.content, file.name);
        
        // Submit to analysis API
        const payload = {
          text: metadata.text || file.content.slice(0, 5000), // Limit to 5000 chars
          language: metadata.language || "en",
          source: metadata.source || file.name,
          platform: metadata.platform || "email",
          region: metadata.region || "",
          actor_id: metadata.actorId || "",
          tags: metadata.tags || "",
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
            error: error.message,
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
