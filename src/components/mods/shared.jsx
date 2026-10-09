import React, { useState, useEffect, useCallback } from 'react'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

// ─── Shared types / constants ───────────────────────────────────────────────

export const PLATFORMS = {
  modrinth: {
    id: 'modrinth',
    label: 'Modrinth',
    color: 'green',
    loaderColors: {
      fabric: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
      forge: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
      neoforge: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
      quilt: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
      legacy: { bg: 'bg-neutral-500/20', text: 'text-neutral-300', border: 'border-neutral-500/40' },
    },
  },
  curseforge: {
    id: 'curseforge',
    label: 'CurseForge',
    color: 'orange',
    loaderColors: {
      forge: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
      fabric: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
    },
  },
}

export const CONTENT_TYPES = {
  modrinth: [
    { id: 'mod', label: 'Mods' },
    { id: 'modpack', label: 'Modpacks' },
    { id: 'shader', label: 'Shaders' },
    { id: 'resourcepack', label: 'Resource Packs' },
    { id: 'datapack', label: 'Datapacks' },
  ],
  curseforge: [
    { id: 'mods', label: 'Mods' },
    { id: 'modpacks', label: 'Modpacks' },
    { id: 'textures', label: 'Textures' },
  ],
}

export const SORT_OPTIONS = {
  modrinth: [
    { id: 'relevance', label: 'Relevance' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'follows', label: 'Follows' },
    { id: 'newest', label: 'Newest' },
    { id: 'updated', label: 'Updated' },
  ],
  curseforge: [
    { id: 'relevance', label: 'Popularity' },
    { id: 'name', label: 'Name' },
    { id: 'updated', label: 'Recently Updated' },
    { id: 'created', label: 'Newest' },
    { id: 'downloads', label: 'Downloads' },
  ],
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function formatDownloads(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Default filters ──────────────────────────────────────────────────────────

export function getDefaultFilters(platform, contentType = 'mod') {
  const defaults = {
    query: '',
    contentType,
    sortBy: 'relevance',
    gameVersions: [],
    loaders: [],
    categories: [],
  }

  if (platform === 'curseforge') {
    defaults.categories = []
  }

  return defaults
}
