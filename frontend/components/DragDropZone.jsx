"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function DragDropZone({ 
  onFilesAccepted, 
  acceptedFileTypes = { 
    "text/plain": [".txt"], 
    "text/html": [".html", ".htm"],
    "application/json": [".json"],
    "message/rfc822": [".eml"],
  },
  maxFiles = 5,
  title = "Drag & Drop Files",
  description = "Drop your emails or social posts here, or click to browse",
}) {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setFiles(acceptedFiles);
      setProcessing(true);

      // Read file contents
      const fileContents = await Promise.all(
        acceptedFiles.map(async (file) => {
          const text = await file.text();
          return {
            name: file.name,
            size: file.size,
            type: file.type,
            content: text,
          };
        })
      );

      if (onFilesAccepted) {
        await onFilesAccepted(fileContents);
      }

      setProcessing(false);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles,
    multiple: true,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ${
          isDragActive
            ? "border-emerald-400 bg-emerald-500/10 shadow-2xl shadow-emerald-500/20"
            : isDragReject
            ? "border-red-400 bg-red-500/10"
            : "border-white/20 bg-slate-900/50 hover:border-emerald-400/50 hover:bg-slate-900/70"
        }`}
      >
        <input {...getInputProps()} />
        
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Content */}
        <div className="relative flex min-h-[320px] flex-col items-center justify-center p-12 text-center">
          {/* Icon */}
          <div className={`mb-6 rounded-2xl p-6 transition-all duration-300 ${
            isDragActive ? "scale-110 bg-emerald-500/20" : "bg-slate-800/50"
          }`}>
            <svg
              className={`h-16 w-16 transition-colors duration-300 ${
                isDragActive ? "text-emerald-400" : "text-slate-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text */}
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            {isDragActive
              ? "Drop files here..."
              : isDragReject
              ? "Some files are not accepted"
              : description}
          </p>

          {/* Supported Formats */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {Object.values(acceptedFileTypes)
              .flat()
              .map((ext) => (
                <span
                  key={ext}
                  className="rounded-lg bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-400"
                >
                  {ext}
                </span>
              ))}
          </div>

          {/* Click to Browse */}
          <button className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30">
            Browse Files
          </button>
        </div>
      </div>

      {/* Processing Indicator */}
      {processing && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-emerald-400" />
          <span className="text-sm text-slate-400">Processing files...</span>
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && !processing && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Uploaded Files ({files.length})</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 p-4 transition-all hover:bg-slate-900/70"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
