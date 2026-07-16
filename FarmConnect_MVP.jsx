import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const G = {
  soil:    "#1B4332",  // deep forest green — primary brand
  leaf:    "#2D6A4F",  // mid green — buttons, accents
  sprout:  "#40916C",  // bright green — hover states
  field:   "#52B788",  // light green — highlights
  mist:    "#D8F3DC",  // near-white green — backgrounds
  amber:   "#E76F00",  // harvest amber — CTA, money, alerts
  clay:    "#6B3F00",  // dark brown — earthy text
  sky:     "#EEF4FF",  // soft blue — buyer side tint
  ink:     "#1A1A1A",  // near-black text
  stone:   "#6B7280",  // secondary text
  cream:   "#FAFAF7",  // page background
  white:   "#FFFFFF",
  border:  "#E5E7EB",
  red:     "#DC2626",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: ${G.cream};
    color: ${G.ink};
    min-height: 100vh;
  }

  /* ── LAYOUT ── */
  .app { display: flex; flex-direction: column; min-height: 100vh; }
  .topbar {
    background: ${G.soil};
    color: white;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; height: 60px;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
  }
  .topbar-brand {
    font-family: 'DM Serif Display', serif;
    font-size: 22px; letter-spacing: 0.5px; color: white;
    display: flex; align-items: center; gap: 10px;
  }
  .topbar-brand span { color: ${G.field}; }
  .topbar-nav { display: flex; gap: 6px; }
  .nav-btn {
    padding: 7px 16px; border-radius: 8px; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
    transition: all 0.15s ease;
    background: transparent; color: rgba(255,255,255,0.7);
  }
  .nav-btn:hover { background: rgba(255,255,255,0.1); color: white; }
  .nav-btn.active { background: ${G.leaf}; color: white; }
  .nav-badge {
    background: ${G.amber}; color: white; border-radius: 10px;
    padding: 1px 6px; font-size: 10px; font-weight: 700; margin-left: 4px;
  }

  /* ── ROLE SELECTOR (LANDING) ── */
  .landing {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 48px 24px; gap: 40px;
  }
  .landing-hero {
    text-align: center; max-width: 560px;
  }
  .landing-hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 48px; color: ${G.soil}; line-height: 1.1; margin-bottom: 12px;
  }
  .landing-hero h1 em { color: ${G.amber}; font-style: italic; }
  .landing-hero p { color: ${G.stone}; font-size: 16px; line-height: 1.6; }
  .role-cards { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
  .role-card {
    background: white; border: 2px solid ${G.border};
    border-radius: 20px; padding: 36px 32px; width: 220px;
    cursor: pointer; text-align: center; transition: all 0.2s ease;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .role-card:hover {
    border-color: ${G.leaf}; transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(27,67,50,0.15);
  }
  .role-card.farmer:hover { border-color: ${G.leaf}; }
  .role-card.buyer:hover { border-color: #3B82F6; }
  .role-card.admin:hover { border-color: ${G.amber}; }
  .role-icon { font-size: 44px; }
  .role-title { font-size: 17px; font-weight: 700; color: ${G.ink}; }
  .role-desc { font-size: 13px; color: ${G.stone}; line-height: 1.4; }
  .role-tag {
    font-size: 11px; font-weight: 600; padding: 3px 10px;
    border-radius: 20px; background: ${G.mist}; color: ${G.leaf};
  }
  .role-tag.buyer-tag { background: #EFF6FF; color: #3B82F6; }
  .role-tag.admin-tag { background: #FFF7ED; color: ${G.amber}; }

  /* ── STATS BAR ── */
  .stats-bar {
    background: ${G.soil}; padding: 12px 28px;
    display: flex; gap: 32px; overflow-x: auto;
  }
  .stat-item { text-align: center; min-width: 80px; }
  .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 500; color: ${G.field}; }
  .stat-lbl { font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── MAIN CONTENT ── */
  .main { display: flex; flex: 1; }
  .sidebar {
    width: 220px; background: white; border-right: 1px solid ${G.border};
    padding: 20px 12px; display: flex; flex-direction: column; gap: 4px;
    position: sticky; top: 60px; height: calc(100vh - 60px);
  }
  .sidebar-section { font-size: 10px; font-weight: 700; color: ${G.stone}; text-transform: uppercase; letter-spacing: 0.8px; padding: 12px 12px 4px; }
  .sidebar-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 8px; cursor: pointer;
    font-size: 14px; color: ${G.stone}; transition: all 0.12s;
    border: none; background: none; width: 100%; text-align: left;
  }
  .sidebar-item:hover { background: ${G.mist}; color: ${G.soil}; }
  .sidebar-item.active { background: ${G.mist}; color: ${G.soil}; font-weight: 600; }
  .sidebar-item .icon { font-size: 16px; }
  .content { flex: 1; padding: 28px; overflow-y: auto; max-width: 1100px; }

  /* ── CARDS & GRIDS ── */
  .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 28px; color: ${G.soil}; margin-bottom: 4px;
  }
  .page-subtitle { font-size: 14px; color: ${G.stone}; margin-bottom: 24px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .card {
    background: white; border: 1px solid ${G.border};
    border-radius: 16px; padding: 20px; transition: box-shadow 0.15s;
  }
  .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
  .card-title { font-size: 12px; font-weight: 600; color: ${G.stone}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .card-value { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 500; color: ${G.soil}; }
  .card-value.amber { color: ${G.amber}; }
  .card-delta { font-size: 12px; color: #16A34A; margin-top: 4px; font-weight: 500; }
  .card-delta.neg { color: ${G.red}; }

  /* ── PRODUCE LISTINGS ── */
  .produce-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .produce-card {
    background: white; border: 1px solid ${G.border};
    border-radius: 16px; overflow: hidden; cursor: pointer;
    transition: all 0.18s ease; position: relative;
  }
  .produce-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(27,67,50,0.12);
    border-color: ${G.field};
  }
  .produce-emoji { font-size: 52px; text-align: center; padding: 20px; background: ${G.mist}; line-height: 1; }
  .produce-body { padding: 14px; }
  .produce-name { font-weight: 700; font-size: 15px; color: ${G.ink}; }
  .produce-farmer { font-size: 12px; color: ${G.stone}; margin: 2px 0 8px; }
  .produce-price-row { display: flex; align-items: center; justify-content: space-between; }
  .produce-price { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 500; color: ${G.amber}; }
  .produce-unit { font-size: 11px; color: ${G.stone}; }
  .produce-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
  .badge {
    font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px;
    background: ${G.mist}; color: ${G.leaf};
  }
  .badge.organic { background: #FEF3C7; color: #92400E; }
  .badge.express { background: #EDE9FE; color: #6D28D9; }
  .badge.verified { background: #D1FAE5; color: #065F46; }
  .badge.qty { background: #F0FDF4; color: ${G.leaf}; }
  .stock-bar { height: 4px; background: ${G.border}; border-radius: 2px; margin-top: 10px; }
  .stock-fill { height: 4px; background: ${G.field}; border-radius: 2px; }

  /* ── BUTTONS ── */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
    transition: all 0.15s ease;
  }
  .btn-primary { background: ${G.leaf}; color: white; }
  .btn-primary:hover { background: ${G.sprout}; transform: translateY(-1px); }
  .btn-amber { background: ${G.amber}; color: white; }
  .btn-amber:hover { background: #C45E00; }
  .btn-outline { background: transparent; border: 2px solid ${G.leaf}; color: ${G.leaf}; }
  .btn-outline:hover { background: ${G.mist}; }
  .btn-sm { padding: 6px 14px; font-size: 12px; border-radius: 8px; }
  .btn-danger { background: ${G.red}; color: white; }
  .btn-blue { background: #3B82F6; color: white; }
  .btn-blue:hover { background: #2563EB; }
  .btn-ghost { background: transparent; color: ${G.stone}; }
  .btn-ghost:hover { background: ${G.mist}; color: ${G.soil}; }

  /* ── TABLE ── */
  .table-wrap { background: white; border: 1px solid ${G.border}; border-radius: 16px; overflow: hidden; margin-bottom: 24px; }
  .table-header { padding: 16px 20px; border-bottom: 1px solid ${G.border}; display: flex; align-items: center; justify-content: space-between; }
  .table-title { font-weight: 700; font-size: 15px; color: ${G.ink}; }
  table { width: 100%; border-collapse: collapse; }
  th { background: ${G.mist}; padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: ${G.stone}; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 12px 16px; border-bottom: 1px solid ${G.border}; font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #FAFAFA; }

  /* ── STATUS PILLS ── */
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  }
  .pill-green { background: #D1FAE5; color: #065F46; }
  .pill-amber { background: #FEF3C7; color: #92400E; }
  .pill-blue { background: #DBEAFE; color: #1D4ED8; }
  .pill-red { background: #FEE2E2; color: #991B1B; }
  .pill-gray { background: #F3F4F6; color: #374151; }
  .pill-purple { background: #EDE9FE; color: #6D28D9; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  /* ── FORM ── */
  .form-section { background: white; border: 1px solid ${G.border}; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
  .form-section-title { font-weight: 700; font-size: 15px; color: ${G.ink}; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${G.border}; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .form-label { font-size: 12px; font-weight: 600; color: ${G.stone}; }
  .form-input {
    padding: 10px 14px; border: 1.5px solid ${G.border}; border-radius: 10px;
    font-family: 'Inter', sans-serif; font-size: 14px; color: ${G.ink};
    transition: border-color 0.12s; background: white; outline: none;
  }
  .form-input:focus { border-color: ${G.field}; box-shadow: 0 0 0 3px rgba(82,183,136,0.15); }
  .form-select {
    padding: 10px 14px; border: 1.5px solid ${G.border}; border-radius: 10px;
    font-family: 'Inter', sans-serif; font-size: 14px; color: ${G.ink};
    background: white; outline: none; cursor: pointer;
  }
  .form-select:focus { border-color: ${G.field}; }

  /* ── ALERTS / CALLOUTS ── */
  .alert {
    padding: 12px 16px; border-radius: 12px; font-size: 13px;
    margin-bottom: 16px; display: flex; align-items: center; gap: 10px;
  }
  .alert-green { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
  .alert-amber { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
  .alert-blue { background: #DBEAFE; color: #1D4ED8; border: 1px solid #BFDBFE; }

  /* ── ORDER MODAL ── */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    z-index: 200; display: flex; align-items: center; justify-content: center;
    padding: 20px; backdrop-filter: blur(2px);
  }
  .modal {
    background: white; border-radius: 24px; padding: 32px;
    max-width: 500px; width: 100%; max-height: 85vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  .modal-title { font-family: 'DM Serif Display', serif; font-size: 24px; color: ${G.soil}; margin-bottom: 4px; }
  .modal-sub { font-size: 13px; color: ${G.stone}; margin-bottom: 20px; }
  .modal-produce-row {
    display: flex; align-items: center; gap: 14px;
    background: ${G.mist}; border-radius: 14px; padding: 14px; margin-bottom: 20px;
  }
  .modal-emoji { font-size: 40px; }
  .modal-detail-title { font-weight: 700; font-size: 16px; }
  .modal-detail-farm { font-size: 12px; color: ${G.stone}; }
  .order-summary {
    background: #FAFAFA; border: 1px solid ${G.border};
    border-radius: 12px; padding: 16px; margin: 16px 0;
  }
  .summary-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .summary-row.total { border-top: 1px solid ${G.border}; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 15px; }
  .summary-row.highlight { color: ${G.leaf}; }
  .summary-row.tax { color: ${G.stone}; font-size: 12px; }

  /* ── CHART (simple bar) ── */
  .chart-wrap { background: white; border: 1px solid ${G.border}; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
  .chart-title { font-weight: 700; font-size: 15px; color: ${G.ink}; margin-bottom: 16px; }
  .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; }
  .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .bar { border-radius: 6px 6px 0 0; width: 100%; background: ${G.field}; transition: all 0.3s; min-height: 4px; }
  .bar:hover { background: ${G.sprout}; }
  .bar-lbl { font-size: 10px; color: ${G.stone}; text-align: center; }
  .bar-val { font-size: 10px; color: ${G.leaf}; font-weight: 600; }

  /* ── FLOW DIAGRAM ── */
  .flow { display: flex; align-items: center; gap: 8px; padding: 20px; background: ${G.mist}; border-radius: 16px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center; }
  .flow-node {
    background: white; border: 2px solid ${G.field};
    border-radius: 12px; padding: 10px 16px; text-align: center; min-width: 90px;
  }
  .flow-node-title { font-weight: 700; font-size: 13px; color: ${G.soil}; }
  .flow-node-sub { font-size: 10px; color: ${G.stone}; }
  .flow-arrow { font-size: 20px; color: ${G.leaf}; }
  .flow-node.highlight { background: ${G.soil}; border-color: ${G.soil}; }
  .flow-node.highlight .flow-node-title { color: white; }
  .flow-node.highlight .flow-node-sub { color: ${G.field}; }
  .flow-node.amber { background: ${G.amber}; border-color: ${G.amber}; }
  .flow-node.amber .flow-node-title { color: white; }
  .flow-node.amber .flow-node-sub { color: #FFE0B2; }

  /* ── EMPTY STATE ── */
  .empty { text-align: center; padding: 60px 20px; color: ${G.stone}; }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-title { font-size: 17px; font-weight: 600; color: ${G.ink}; margin-bottom: 6px; }
  .empty-desc { font-size: 13px; line-height: 1.6; }

  /* ── TOAST ── */
  .toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 300;
    background: ${G.soil}; color: white; padding: 14px 20px;
    border-radius: 14px; font-size: 14px; font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    display: flex; align-items: center; gap: 10px; max-width: 320px;
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── PROGRESS ── */
  .progress-track { background: ${G.border}; border-radius: 4px; height: 8px; margin: 6px 0; }
  .progress-fill { height: 8px; border-radius: 4px; background: ${G.field}; }

  /* ── GOVT DASHBOARD ── */
  .govt-header {
    background: linear-gradient(135deg, #1A237E 0%, #283593 100%);
    color: white; padding: 28px; border-radius: 16px; margin-bottom: 24px;
  }
  .govt-title { font-family: 'DM Serif Display', serif; font-size: 26px; margin-bottom: 4px; }
  .govt-sub { font-size: 13px; opacity: 0.7; }
  .govt-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; }
  .govt-stat { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; }
  .govt-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 500; }
  .govt-stat-lbl { font-size: 11px; opacity: 0.65; margin-top: 2px; }
  .map-placeholder {
    background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
    border-radius: 16px; height: 200px; display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px; border: 1px solid ${G.border}; position: relative; overflow: hidden;
  }
  .map-dot { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: ${G.soil}; }
  .map-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; background: rgba(27,67,50,0.25); animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.8);opacity:0.4} }

  /* ── WALLET / INCOME ── */
  .wallet-card {
    background: linear-gradient(135deg, ${G.soil} 0%, ${G.leaf} 100%);
    color: white; border-radius: 20px; padding: 28px; margin-bottom: 24px;
    position: relative; overflow: hidden;
  }
  .wallet-card::before {
    content: ''; position: absolute; top: -40px; right: -40px;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .wallet-label { font-size: 12px; opacity: 0.7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .wallet-amount { font-family: 'DM Serif Display', serif; font-size: 44px; margin: 4px 0; }
  .wallet-sub { font-size: 13px; opacity: 0.6; }

  /* ── SEARCH BAR ── */
  .search-bar {
    display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    background: white; border: 1.5px solid ${G.border}; border-radius: 12px; padding: 8px 14px;
  }
  .search-icon { font-size: 16px; color: ${G.stone}; }
  .search-input { flex: 1; border: none; outline: none; font-family: 'Inter', sans-serif; font-size: 14px; color: ${G.ink}; background: transparent; }
  .filter-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .filter-chip {
    padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
    border: 1.5px solid ${G.border}; cursor: pointer; transition: all 0.12s;
    background: white; color: ${G.stone};
  }
  .filter-chip.active { background: ${G.soil}; border-color: ${G.soil}; color: white; }
  .filter-chip:hover:not(.active) { border-color: ${G.leaf}; color: ${G.leaf}; }

  .section-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .section-head { font-weight: 700; font-size: 16px; color: ${G.ink}; }
`;

// ─── DATA ────────────────────────────────────────────────────────
const CHART_DATA = [
  { label:"Jan", val:12 }, { label:"Feb", val:18 }, { label:"Mar", val:15 },
  { label:"Apr", val:28 }, { label:"May", val:35 }, { label:"Jun", val:42 },
];

const statusConfig = {
  delivered:  { cls:"pill-green",  icon:"✓", label:"Delivered" },
  "in-transit":{ cls:"pill-blue",  icon:"🚛", label:"In Transit" },
  confirmed:  { cls:"pill-purple", icon:"✅", label:"Confirmed" },
  pending:    { cls:"pill-amber",  icon:"⏳", label:"Pending" },
};

const computeQaScore = (product) => {
  const baseScore = Number(product.rating ?? 4.8) * 20;
  const organicBonus = product.organic ? 6 : 0;
  const expressBonus = product.express ? 3 : 0;
  const quantityBonus = product.qty > 500 ? 2 : 0;
  return Math.min(100, Math.round(baseScore + organicBonus + expressBonus + quantityBonus));
};

const getQaGrade = (score) => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
};

const normalizeProduce = (row) => ({
  id: row.id ?? row.listing_id ?? row.listingId,
  name: row.name || row.produce_name || row.produce || "Produce",
  farmer: row.farmer || "Local Farmer",
  village: row.village || "Tamil Nadu",
  emoji: row.emoji || "🌾",
  price: Number(row.price ?? row.price_per_kg ?? row.pricePerKg ?? 0),
  msP: Number(row.ms_p ?? row.mandi_price ?? row.mandiPrice ?? row.price ?? 0),
  unit: row.unit || "kg",
  qty: Number(row.qty ?? row.quantity ?? 0),
  organic: Boolean(row.organic),
  express: Boolean(row.express),
  delivery: row.delivery || "Tomorrow",
  rating: Number(row.rating ?? 4.8),
  reviews: Number(row.reviews ?? 10),
  category: row.category || "Vegetables",
  qaScore: Number(row.qa_score ?? row.qaScore ?? computeQaScore({
    rating: Number(row.rating ?? 4.8),
    organic: Boolean(row.organic),
    express: Boolean(row.express),
    qty: Number(row.qty ?? row.quantity ?? 0),
  })),
  qaGrade: getQaGrade(Number(row.qa_score ?? row.qaScore ?? computeQaScore({
    rating: Number(row.rating ?? 4.8),
    organic: Boolean(row.organic),
    express: Boolean(row.express),
    qty: Number(row.qty ?? row.quantity ?? 0),
  }))),
  created_at: row.created_at,
});

const normalizeOrder = (row) => ({
  id: row.id ?? row.order_id ?? row.orderId ?? `FC${Math.floor(Math.random()*9000)+1000}`,
  produce: row.produce || row.produce_name || "Produce",
  farmer: row.farmer || "Unknown Farmer",
  buyer: row.buyer || "Guest Buyer",
  qty: Number(row.qty ?? row.quantity ?? 0),
  amount: Number(row.amount ?? row.total ?? 0),
  status: row.status || "pending",
  date: row.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  payment: row.payment || "UPI",
  gst: Number(row.gst ?? 0),
  created_at: row.created_at,
});

const loadProduceFromSupabase = async (setter) => {
  if (!supabase) return;
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (!error && data) {
    setter(data.map(normalizeProduce));
  }
};

const loadOrdersFromSupabase = async (setter) => {
  if (!supabase) return;
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (!error && data) {
    setter(data.map(normalizeOrder));
  }
};

const saveProduceToSupabase = async (payload) => {
  if (!supabase) return null;
  const { data, error } = await supabase.from("products").insert([payload]).select("*").single();
  return error ? null : normalizeProduce(data);
};

const saveOrderToSupabase = async (payload) => {
  if (!supabase) return null;
  const { data: { user } = {} } = await supabase.auth.getUser();
  const orderPayload = {
    ...payload,
    user_id: payload.user_id ?? user?.id ?? null,
    buyer_id: payload.buyer_id ?? user?.id ?? null,
  };
  const { data, error } = await supabase.from("orders").insert([orderPayload]).select("*").single();
  return error ? null : normalizeOrder(data);
};

const createProfileForUser = async ({ id, email, fullName, role = "Buyer" }) => {
  if (!supabase || !id) return null;
  const profilePayload = {
    id,
    email,
    full_name: fullName,
    role,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" }).select("*").single();
  return error ? null : data;
};

const normalizeRoleValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["farmer", "farmerrole", "grower"].includes(normalized)) return "farmer";
  if (["buyer", "hotel", "hotelbuyer", "buyerrole"].includes(normalized)) return "buyer";
  if (["admin", "administrator", "superadmin", "super-admin"].includes(normalized)) return "admin";
  if (["govt", "government", "govtrole", "official"].includes(normalized)) return "govt";
  return "buyer";
};

const getRoleLabel = (value) => {
  const normalized = normalizeRoleValue(value);
  if (normalized === "farmer") return "Farmer";
  if (normalized === "admin") return "Admin";
  if (normalized === "govt") return "Government";
  return "Buyer";
};

const getRoleValueForSignup = (value) => {
  const normalized = normalizeRoleValue(value);
  if (normalized === "farmer") return "Farmer";
  if (normalized === "admin") return "Admin";
  if (normalized === "govt") return "Government";
  return "Buyer";
};

// ─── COMPONENTS ──────────────────────────────────────────────────
function StatusPill({ s }) {
  const c = statusConfig[s] || { cls:"pill-gray", icon:"·", label:s };
  return <span className={`pill ${c.cls}`}><span className="dot" />{c.label}</span>;
}

function Toast({ msg, onClose }) {
  useState(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return <div className="toast">✅ {msg}</div>;
}

function OrderModal({ item, onClose, onOrder }) {
  const [qty, setQty] = useState(50);
  const subtotal = qty * item.price;
  const gst = Math.round(subtotal * 0.05 * 0.18);
  const platform = Math.round(subtotal * 0.05);
  const farmer = Math.round(subtotal * 0.90);
  const total = subtotal + gst;

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div>
            <div className="modal-title">Place Order</div>
            <div className="modal-sub">Escrow-protected · GST invoice included</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{fontSize:18}}>✕</button>
        </div>

        <div className="modal-produce-row">
          <div className="modal-emoji">{item.emoji}</div>
          <div>
            <div className="modal-detail-title">{item.name}</div>
            <div className="modal-detail-farm">🌾 {item.farmer} · {item.village}</div>
            <div style={{marginTop:4}}>
              {item.organic && <span className="badge organic">Organic</span>}
              {item.express && <span className="badge express" style={{marginLeft:4}}>Express</span>}
            </div>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,color:G.amber,fontWeight:500}}>₹{item.price}</div>
            <div style={{fontSize:11,color:G.stone}}>per {item.unit}</div>
            <div style={{fontSize:11,color:"#DC2626",textDecoration:"line-through"}}>Mandi: ₹{item.msP}</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Quantity ({item.unit})</label>
          <input className="form-input" type="number" value={qty} min={10} max={item.qty} onChange={e=>setQty(Number(e.target.value))} />
          <div style={{fontSize:11,color:G.stone}}>Min 10 {item.unit} · Available: {item.qty} {item.unit}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Delivery Date</label>
          <select className="form-select">
            <option>{item.delivery === "Today" ? "Today (Express)" : "Tomorrow"}</option>
            <option>In 2 days</option>
          </select>
        </div>

        <div className="order-summary">
          <div className="summary-row"><span>Subtotal ({qty} {item.unit} × ₹{item.price})</span><span>₹{subtotal.toLocaleString()}</span></div>
          <div className="summary-row highlight"><span>↳ Farmer earns (90%)</span><span>₹{farmer.toLocaleString()}</span></div>
          <div className="summary-row highlight"><span>↳ FarmConnect (5%)</span><span>₹{platform.toLocaleString()}</span></div>
          <div className="summary-row tax"><span>GST (18% on platform fee)</span><span>₹{gst.toLocaleString()}</span></div>
          <div className="summary-row total"><span>Total Payable</span><span style={{color:G.amber}}>₹{total.toLocaleString()}</span></div>
        </div>

        <div className="alert alert-green">🔒 Payment held in escrow · Released to farmer on delivery</div>

        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-outline" onClick={onClose} style={{flex:1}}>Cancel</button>
          <button className="btn btn-amber" onClick={()=>onOrder(item, qty, total)} style={{flex:2}}>
            Pay ₹{total.toLocaleString()} via UPI →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FARMER DASHBOARD ────────────────────────────────────────────
function FarmerDashboard() {
  const [view, setView] = useState("home");
  const [toast, setToast] = useState(null);
  const [listingForm, setListingForm] = useState({ produce:"", qty:"", price:"", date:"", organic:false });
  const [produceItems, setProduceItems] = useState([]);
  const [ordersData, setOrdersData] = useState([]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      await loadProduceFromSupabase((rows) => {
        if (active && rows.length) setProduceItems(rows);
      });
      await loadOrdersFromSupabase((rows) => {
        if (active && rows.length) setOrdersData(rows);
      });
    };
    loadData();
    return () => { active = false; };
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),3200); };

  const myOrders = ordersData.filter(o=>o.farmer.includes("Raman") || o.farmer.includes("Murugan"));

  const nav = [
    { key:"home", icon:"🏠", label:"Home" },
    { key:"listings", icon:"📦", label:"My Listings" },
    { key:"add", icon:"➕", label:"Add Produce" },
    { key:"orders", icon:"📋", label:"Orders" },
    { key:"earnings", icon:"💰", label:"Earnings" },
    { key:"schemes", icon:"🏛️", label:"Govt Schemes" },
  ];

  return (
    <div className="main">
      <style>{css}</style>
      <div className="sidebar">
        <div style={{padding:"12px 12px 16px"}}>
          <div style={{background:G.mist,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontWeight:700,fontSize:14,color:G.soil}}>🌾 Raman Patel</div>
            <div style={{fontSize:11,color:G.stone}}>Erode, Tamil Nadu</div>
            <div style={{display:"flex",gap:4,marginTop:6}}>
              <span className="badge verified">✓ Verified</span>
              <span className="badge organic">Organic</span>
            </div>
          </div>
        </div>
        <div className="sidebar-section">Menu</div>
        {nav.map(n => (
          <button key={n.key} className={`sidebar-item${view===n.key?" active":""}`} onClick={()=>setView(n.key)}>
            <span className="icon">{n.icon}</span>{n.label}
          </button>
        ))}
      </div>

      <div className="content">
        {view==="home" && <>
          <div className="page-title">Good morning, Raman 👋</div>
          <div className="page-subtitle">Here's your farm summary for today · June 20, 2024</div>

          <div className="wallet-card">
            <div className="wallet-label">This Month's Earnings</div>
            <div className="wallet-amount">₹38,400</div>
            <div className="wallet-sub">+₹6,400 more than last month (Mandi price: ₹32K)</div>
            <div style={{marginTop:16,display:"flex",gap:20}}>
              <div><div style={{fontSize:12,opacity:.7}}>Per kg avg</div><div style={{fontSize:18,fontWeight:700}}>₹35.2</div></div>
              <div><div style={{fontSize:12,opacity:.7}}>Orders</div><div style={{fontSize:18,fontWeight:700}}>14</div></div>
              <div><div style={{fontSize:12,opacity:.7}}>Buyers</div><div style={{fontSize:18,fontWeight:700}}>6</div></div>
            </div>
          </div>

          <div className="grid-4">
            <div className="card">
              <div className="card-title">Active Listings</div>
              <div className="card-value">3</div>
              <div className="card-delta">↑ 2 new this week</div>
            </div>
            <div className="card">
              <div className="card-title">Pending Orders</div>
              <div className="card-value amber">2</div>
              <div className="card-delta">Needs action</div>
            </div>
            <div className="card">
              <div className="card-title">Rating</div>
              <div className="card-value">4.8★</div>
              <div className="card-delta">32 reviews</div>
            </div>
            <div className="card">
              <div className="card-title">Govt Schemes</div>
              <div className="card-value">2</div>
              <div className="card-delta">PM-KISAN eligible</div>
            </div>
          </div>

          <div className="chart-wrap">
            <div className="chart-title">Monthly Income (₹000s)</div>
            <div className="bar-chart">
              {CHART_DATA.map(d=>(
                <div className="bar-col" key={d.label}>
                  <div className="bar-val">₹{d.val}K</div>
                  <div className="bar" style={{height:`${(d.val/42)*100}%`}}/>
                  <div className="bar-lbl">{d.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-header"><div className="table-title">Recent Orders</div></div>
            <table>
              <thead><tr><th>Order ID</th><th>Buyer</th><th>Produce</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {myOrders.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontFamily:"'JetBrains Mono',monospace",color:G.leaf}}>{o.id}</td>
                    <td>{o.buyer}</td>
                    <td>{o.produce}</td>
                    <td style={{fontWeight:600}}>₹{o.amount.toLocaleString()}</td>
                    <td><StatusPill s={o.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {view==="add" && <>
          <div className="page-title">List New Produce</div>
          <div className="page-subtitle">Your listing goes live instantly for verified buyers</div>

          <div className="form-section">
            <div className="form-section-title">📦 Produce Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Produce Name</label>
                <select className="form-select" value={listingForm.produce} onChange={e=>setListingForm({...listingForm,produce:e.target.value})}>
                  <option value="">Select produce...</option>
                  {["Tomatoes","Onions","Potatoes","Spinach","Beans","Brinjal","Okra","Mango","Banana"].map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select"><option>Vegetables</option><option>Fruits</option><option>Grains</option></select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Available Quantity (kg)</label>
                <input className="form-input" type="number" placeholder="e.g. 500" value={listingForm.qty} onChange={e=>setListingForm({...listingForm,qty:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Your Price (₹/kg)</label>
                <input className="form-input" type="number" placeholder="e.g. 28" value={listingForm.price} onChange={e=>setListingForm({...listingForm,price:e.target.value})}/>
                <div style={{fontSize:11,color:G.stone}}>Current mandi rate: ~₹22/kg. Earn more here!</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Available From</label>
                <input className="form-input" type="date" value={listingForm.date} onChange={e=>setListingForm({...listingForm,date:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Radius (km)</label>
                <select className="form-select"><option>0–30 km</option><option>30–100 km</option><option>100+ km (state-wide)</option></select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">🌿 Quality Certification</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {["Organic Certified","Soil Health Card","FSSAI Grade A","Pesticide-Free","Drip Irrigated"].map(tag=>(
                <label key={tag} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
                  <input type="checkbox" style={{accentColor:G.leaf}}/> {tag}
                </label>
              ))}
            </div>
          </div>

          <div className="alert alert-blue">📸 Add photos of your produce to get 3× more buyer interest!</div>

          <div style={{display:"flex",gap:12}}>
            <button className="btn btn-outline">Save as Draft</button>
            <button className="btn btn-primary" onClick={async ()=>{
              if (!listingForm.produce || !listingForm.qty || !listingForm.price) {
                showToast("Please complete produce, quantity, and price.");
                return;
              }
              const payload = {
                name: listingForm.produce,
                farmer: "Raman Patel",
                village: "Erode",
                emoji: "🌾",
                price: Number(listingForm.price),
                ms_p: Number(listingForm.price) - 3,
                unit: "kg",
                qty: Number(listingForm.qty),
                organic: listingForm.organic,
                express: false,
                delivery: listingForm.date ? "Tomorrow" : "Today",
                rating: 4.8,
                reviews: 12,
                category: "Vegetables",
              };
              const saved = await saveProduceToSupabase(payload);
              if (saved) {
                setProduceItems(prev => [saved, ...prev]);
              }
              showToast(saved ? "Produce saved to Supabase" : "Listing staged locally for demo");
              setView("listings");
            }}>
              🚀 Publish Listing
            </button>
          </div>
        </>}

        {view==="listings" && <>
          <div className="page-title">My Listings</div>
          <div className="page-subtitle">3 active · 1 draft · 2 sold out</div>
          <div className="produce-grid">
            {produceItems.slice(0,4).map(p=>(
              <div className="produce-card" key={p.id}>
                <div className="produce-emoji">{p.emoji}</div>
                <div className="produce-body">
                  <div className="produce-name">{p.name}</div>
                  <div className="produce-price-row">
                    <div>
                      <div className="produce-price">₹{p.price}</div>
                      <div className="produce-unit">per {p.unit}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>Edit</button>
                  </div>
                  <div className="stock-bar"><div className="stock-fill" style={{width:`${(p.qty/1200)*100}%`}}/></div>
                  <div style={{fontSize:11,color:G.stone,marginTop:4}}>{p.qty} {p.unit} remaining</div>
                  <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone}}>
                    <span>QA Score</span>
                    <span style={{fontWeight:700,color:G.leaf}}>{p.qaScore}/100</span>
                  </div>
                  <div style={{marginTop:4,display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone}}>
                    <span>Grade</span>
                    <span style={{fontWeight:700,color:G.amber}}>Grade {p.qaGrade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}

        {view==="orders" && <>
          <div className="page-title">Orders</div>
          <div className="page-subtitle">All incoming and completed orders</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order ID</th><th>Buyer</th><th>Produce</th><th>Qty</th><th>Amount</th><th>Your Share (90%)</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {ORDERS.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontFamily:"'JetBrains Mono',monospace",color:G.leaf,fontSize:12}}>{o.id}</td>
                    <td style={{fontSize:12}}>{o.buyer}</td>
                    <td>{o.produce}</td>
                    <td>{o.qty} kg</td>
                    <td style={{fontWeight:600}}>₹{o.amount.toLocaleString()}</td>
                    <td style={{color:G.leaf,fontWeight:700}}>₹{Math.round(o.amount*0.9).toLocaleString()}</td>
                    <td style={{color:G.stone,fontSize:12}}>{o.date}</td>
                    <td><StatusPill s={o.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {view==="earnings" && <>
          <div className="page-title">Earnings & Payments</div>
          <div className="page-subtitle">Your transparent income breakdown</div>
          <div className="wallet-card">
            <div className="wallet-label">Total Lifetime Earnings</div>
            <div className="wallet-amount">₹1,84,320</div>
            <div className="wallet-sub">Paid directly to your UPI · No middleman deductions</div>
          </div>
          <div className="grid-3">
            <div className="card"><div className="card-title">This Month</div><div className="card-value">₹38,400</div><div className="card-delta">↑ 20% vs last month</div></div>
            <div className="card"><div className="card-title">Mandi Would've Paid</div><div className="card-value amber">₹32,000</div><div className="card-delta neg">₹6,400 less</div></div>
            <div className="card"><div className="card-title">You Saved</div><div className="card-value" style={{color:G.leaf}}>₹6,400</div><div className="card-delta">+20% via FarmConnect</div></div>
          </div>
          <div className="table-wrap">
            <div className="table-header"><div className="table-title">Payment History</div></div>
            <table>
              <thead><tr><th>Date</th><th>Order</th><th>Gross Amount</th><th>Platform Fee (5%)</th><th>Your Net (90%)</th><th>Mode</th></tr></thead>
              <tbody>
                {ORDERS.map(o=>(
                  <tr key={o.id}>
                    <td style={{color:G.stone,fontSize:12}}>{o.date} Jun</td>
                    <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:G.leaf}}>{o.id}</td>
                    <td>₹{o.amount.toLocaleString()}</td>
                    <td style={{color:G.stone}}>₹{Math.round(o.amount*0.05).toLocaleString()}</td>
                    <td style={{color:G.leaf,fontWeight:700}}>₹{Math.round(o.amount*0.9).toLocaleString()}</td>
                    <td><span className="badge">{o.payment}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {view==="schemes" && <>
          <div className="page-title">Government Schemes</div>
          <div className="page-subtitle">Benefits you're eligible for as a FarmConnect verified farmer</div>
          <div className="alert alert-green">🎉 You're eligible for 2 schemes! Apply directly through FarmConnect.</div>
          {[
            { name:"PM-KISAN", dept:"Ministry of Agriculture", benefit:"₹6,000/year", status:"Eligible", desc:"Direct income support to small & marginal farmers. Auto-enrolled via your Aadhaar." },
            { name:"Kisan Credit Card", dept:"NABARD / SBI", benefit:"Up to ₹3L credit at 4%", status:"Eligible", desc:"Working capital loan for farming needs. Your 6-month transaction history qualifies you." },
            { name:"Soil Health Card", dept:"State Agriculture Dept", benefit:"Free soil analysis", status:"Applied", desc:"Annual soil health report. Linked to your farm profile." },
            { name:"PMFBY Crop Insurance", dept:"Agriculture Insurance Co.", benefit:"Up to ₹2L coverage", status:"Check Eligibility", desc:"Crop loss insurance for weather, pest, and market fluctuations." },
          ].map(s=>(
            <div className="form-section" key={s.name} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:G.soil}}>{s.name}</div>
                  <div style={{fontSize:11,color:G.stone,margin:"2px 0 8px"}}>{s.dept}</div>
                  <div style={{fontSize:13,color:G.ink,lineHeight:1.5}}>{s.desc}</div>
                  <div style={{marginTop:8,fontFamily:"'JetBrains Mono',monospace",fontSize:15,color:G.amber,fontWeight:500}}>{s.benefit}</div>
                </div>
                <div style={{textAlign:"right",minWidth:140}}>
                  <div style={{marginBottom:8}}>
                    <span className={`pill ${s.status==="Eligible"?"pill-green":s.status==="Applied"?"pill-blue":"pill-amber"}`}>
                      <span className="dot"/> {s.status}
                    </span>
                  </div>
                  <button className={`btn btn-sm ${s.status==="Eligible"?"btn-primary":s.status==="Applied"?"btn-ghost":"btn-outline"}`}
                    onClick={()=>showToast(`${s.name} application submitted!`)}>
                    {s.status==="Eligible"?"Apply Now →":s.status==="Applied"?"Track Status":"Check →"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>}
      </div>
      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}

// ─── BUYER DASHBOARD ─────────────────────────────────────────────
function BuyerDashboard() {
  const [view, setView] = useState("browse");
  const [modal, setModal] = useState(null);
  const [orders, setOrders] = useState([]);
  const [produceItems, setProduceItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      await loadProduceFromSupabase((rows) => {
        if (active && rows.length) setProduceItems(rows);
      });
      await loadOrdersFromSupabase((rows) => {
        if (active && rows.length) setOrders(rows);
      });
    };
    loadData();
    return () => { active = false; };
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),3200); };

  const placeOrder = async (item, qty, total) => {
    const newOrderPayload = {
      produce:item.name,
      farmer:item.farmer,
      buyer:"Hotel Saravana Bhavan",
      qty,
      amount:total,
      status:"pending",
      date:new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      payment:"UPI",
      gst:Math.round(total*0.05*0.18)
    };
    const saved = await saveOrderToSupabase(newOrderPayload);
    if (saved) {
      setOrders([saved,...orders]);
    }
    setModal(null);
    showToast(saved ? `Order placed in Supabase! ₹${total.toLocaleString()} held in escrow.` : `Order placed locally! ₹${total.toLocaleString()} held in escrow.`);
    setView("orders");
  };

  const cats = ["All","Vegetables","Fruits","Other"];
  const filtered = produceItems.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All"
      ? true
      : filter === "express"
        ? p.express
        : filter === "organic"
          ? p.organic
          : p.category === filter;
    return matchesSearch && matchesFilter;
  });

  const nav = [
    { key:"browse", icon:"🛒", label:"Browse Market" },
    { key:"orders", icon:"📋", label:"My Orders" },
    { key:"track", icon:"🚛", label:"Track Delivery" },
    { key:"invoices", icon:"🧾", label:"Invoices" },
  ];

  return (
    <div className="main">
      <style>{css}</style>
      <div className="sidebar" style={{background:"#F8FBFF"}}>
        <div style={{padding:"12px 12px 16px"}}>
          <div style={{background:"#EFF6FF",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontWeight:700,fontSize:14,color:"#1D4ED8"}}>🏨 Hotel Saravana Bhavan</div>
            <div style={{fontSize:11,color:G.stone}}>GSTIN: 33AABCS1429B1ZB</div>
            <div style={{marginTop:6}}><span className="badge" style={{background:"#DBEAFE",color:"#1D4ED8"}}>✓ Verified Business</span></div>
          </div>
        </div>
        <div className="sidebar-section">Menu</div>
        {nav.map(n=>(
          <button key={n.key} className={`sidebar-item${view===n.key?" active":""}`} onClick={()=>setView(n.key)}
            style={view===n.key?{background:"#EFF6FF",color:"#1D4ED8"}:{}}>
            <span className="icon">{n.icon}</span>{n.label}
            {n.key==="orders" && <span className="nav-badge" style={{background:"#3B82F6"}}>5</span>}
          </button>
        ))}
        <div style={{marginTop:"auto",padding:"12px"}}>
          <div style={{background:"#FFF7ED",borderRadius:12,padding:"12px",border:"1px solid #FED7AA"}}>
            <div style={{fontSize:11,fontWeight:700,color:G.amber}}>💰 Monthly Savings</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,color:G.soil,fontWeight:500}}>₹12,400</div>
            <div style={{fontSize:11,color:G.stone}}>vs mandi prices this month</div>
          </div>
        </div>
      </div>

      <div className="content" style={{background:G.sky}}>
        {view==="browse" && <>
          <div className="page-title">Fresh Market</div>
          <div className="page-subtitle">Direct from verified Tamil Nadu farms · Updated daily</div>

          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Search tomatoes, onions, spinach..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <button className="btn btn-sm btn-primary">Search</button>
          </div>

          <div className="filter-row">
            {cats.map(c=><button key={c} className={`filter-chip${filter===c?" active":""}`} onClick={()=>setFilter(c)}>{c}</button>)}
            <button className={`filter-chip${filter==="express"?" active":""}`} onClick={()=>setFilter("express")} style={filter==="express"?{background:"#6D28D9",borderColor:"#6D28D9",color:"white"}:{}}>⚡ Express Delivery</button>
            <button className={`filter-chip${filter==="organic"?" active":""}`} onClick={()=>setFilter("organic")} style={filter==="organic"?{background:"#92400E",borderColor:"#92400E",color:"white"}:{}}>🌿 Organic Only</button>
          </div>

          <div className="produce-grid">
            {filtered.map(p=>(
              <div className="produce-card" key={p.id} onClick={()=>setModal(p)}>
                <div className="produce-emoji">{p.emoji}</div>
                <div className="produce-body">
                  <div className="produce-name">{p.name}</div>
                  <div className="produce-farmer">🌾 {p.farmer} · {p.village}</div>
                  <div className="produce-price-row">
                    <div>
                      <div className="produce-price">₹{p.price}</div>
                      <div className="produce-unit">per {p.unit}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:"#6B7280",textDecoration:"line-through"}}>Mandi ₹{p.msP}</div>
                      <div style={{fontSize:10,color:"#16A34A",fontWeight:600}}>Save ₹{p.price-p.msP}</div>
                    </div>
                  </div>
                  <div className="produce-badges">
                    {p.organic && <span className="badge organic">🌿 Organic</span>}
                    {p.express && <span className="badge express">⚡ Today</span>}
                    <span className="badge verified">✓ Verified</span>
                    <span className="badge qty">{p.qty}{p.unit}</span>
                  </div>
                  <div style={{marginTop:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone,marginBottom:3}}>
                      <span>Stock</span><span>{p.qty} {p.unit}</span>
                    </div>
                    <div className="stock-bar"><div className="stock-fill" style={{width:`${Math.min((p.qty/1000)*100,100)}%`}}/></div>
                  </div>
                  <div style={{marginTop:10,display:"flex",alignItems:"center",gap:4,fontSize:11,color:G.stone}}>
                    ⭐{p.rating} <span>({p.reviews} reviews)</span>
                  </div>
                  <div style={{marginTop:6,display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone}}>
                    <span>QA Score</span>
                    <span style={{fontWeight:700,color:G.leaf}}>{p.qaScore}/100</span>
                  </div>
                  <div style={{marginTop:4,display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone}}>
                    <span>Grade</span>
                    <span style={{fontWeight:700,color:G.amber}}>Grade {p.qaGrade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}

        {view==="orders" && <>
          <div className="page-title">My Orders</div>
          <div className="page-subtitle">Full order history with GST invoices</div>
          <div className="table-wrap" style={{background:"white"}}>
            <table>
              <thead><tr><th>Order ID</th><th>Produce</th><th>Farmer</th><th>Qty</th><th>Amount</th><th>GST (Govt)</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {orders.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontFamily:"'JetBrains Mono',monospace",color:"#3B82F6",fontSize:12}}>{o.id}</td>
                    <td>{o.produce}</td>
                    <td style={{fontSize:12}}>{o.farmer}</td>
                    <td>{o.qty} kg</td>
                    <td style={{fontWeight:600}}>₹{o.amount.toLocaleString()}</td>
                    <td style={{color:G.leaf,fontSize:12}}>₹{o.gst.toLocaleString()}</td>
                    <td style={{color:G.stone,fontSize:12}}>{o.date}</td>
                    <td><StatusPill s={o.status}/></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={()=>showToast("Invoice downloaded!")}>🧾</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {view==="track" && <>
          <div className="page-title">Track Delivery</div>
          <div className="page-subtitle">Real-time status of your active orders</div>
          {ORDERS.filter(o=>o.status!=="delivered").map(o=>(
            <div className="form-section" key={o.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:700}}>{o.produce} — {o.qty} kg</div>
                  <div style={{fontSize:12,color:G.stone}}>Order {o.id} · ₹{o.amount.toLocaleString()}</div>
                </div>
                <StatusPill s={o.status}/>
              </div>
              <div style={{display:"flex",gap:0,position:"relative"}}>
                {["Order Placed","Payment Secured","Farmer Confirmed","In Transit","Delivered"].map((step,i)=>{
                  const stepOrder = ["confirmed","confirmed","confirmed","in-transit","delivered"];
                  const done = stepOrder.indexOf(o.status)>=i;
                  return (
                    <div key={step} style={{flex:1,textAlign:"center",position:"relative"}}>
                      <div style={{width:24,height:24,borderRadius:"50%",margin:"0 auto 6px",
                        background:done?G.leaf:G.border,color:"white",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,
                        position:"relative",zIndex:1}}>
                        {done?"✓":i+1}
                      </div>
                      {i<4 && <div style={{position:"absolute",top:11,left:"60%",right:"-40%",height:2,background:done?G.field:G.border,zIndex:0}}/>}
                      <div style={{fontSize:10,color:done?G.soil:G.stone,fontWeight:done?600:400}}>{step}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>}

        {view==="invoices" && <>
          <div className="page-title">GST Invoices</div>
          <div className="page-subtitle">Auto-generated tax invoices for all orders</div>
          {ORDERS.filter(o=>o.status==="delivered").map(o=>(
            <div className="form-section" key={o.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",color:G.leaf,fontSize:13}}>Invoice #{o.id}</div>
                  <div style={{fontWeight:700,marginTop:2}}>{o.produce} — {o.qty} kg</div>
                  <div style={{fontSize:12,color:G.stone}}>Farmer: {o.farmer} · Paid via {o.payment}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:500,color:G.soil}}>₹{o.amount.toLocaleString()}</div>
                  <div style={{fontSize:11,color:G.stone}}>GST: ₹{o.gst.toLocaleString()} → Govt</div>
                  <button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={()=>showToast("Invoice PDF downloaded!")}>⬇ Download PDF</button>
                </div>
              </div>
            </div>
          ))}
        </>}
      </div>

      {modal && <OrderModal item={modal} onClose={()=>setModal(null)} onOrder={placeOrder}/>}
      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}

// ─── ADMIN / GOVT DASHBOARD ──────────────────────────────────────
function AdminDashboard({ role }) {
  const [view, setView] = useState("overview");
  const [toast, setToast] = useState(null);
  const [orders, setOrders] = useState([]);
  const [produceItems, setProduceItems] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [profileStatus, setProfileStatus] = useState("loading");
  const [updatingProfileId, setUpdatingProfileId] = useState(null);
  const isGovt = role==="govt";
  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),3200); };

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      await loadProduceFromSupabase((rows) => {
        if (active && rows.length) setProduceItems(rows);
      });
      await loadOrdersFromSupabase((rows) => {
        if (active && rows.length) setOrders(rows);
      });

      if (!supabase || isGovt) return;
      const { data, error } = await supabase.from("profiles").select("id,email,full_name,role").order("created_at", { ascending: false });
      if (!active) return;
      if (!error && data) {
        setProfiles(data);
        setProfileStatus("ready");
      } else {
        setProfiles([]);
        setProfileStatus(error?.message || "failed");
      }
    };
    loadData();
    return () => { active = false; };
  }, [isGovt]);

  const totalGMV = orders.reduce((s,o)=>s+o.amount,0);
  const totalGST = orders.reduce((s,o)=>s+o.gst,0);

  const nav = isGovt ? [
    { key:"overview", icon:"🏛️", label:"Overview" },
    { key:"revenue", icon:"💰", label:"Tax Revenue" },
    { key:"farmers", icon:"🌾", label:"Farmer Data" },
    { key:"schemes", icon:"📋", label:"Scheme Impact" },
  ] : [
    { key:"overview", icon:"📊", label:"Overview" },
    { key:"transactions", icon:"💳", label:"All Transactions" },
    { key:"farmers", icon:"🌾", label:"Farmers" },
    { key:"buyers", icon:"🏨", label:"Buyers" },
    { key:"users", icon:"👤", label:"Users" },
    { key:"disputes", icon:"⚠️", label:"Disputes" },
    { key:"compliance", icon:"📜", label:"Compliance" },
  ];

  const updateUserRole = async (profileId, nextRole) => {
    if (!supabase) return;
    setUpdatingProfileId(profileId);
    const roleValue = getRoleValueForSignup(nextRole);
    const { error } = await supabase.from("profiles").update({ role: roleValue }).eq("id", profileId);
    setUpdatingProfileId(null);
    if (error) {
      setProfileStatus(error.message || "Unable to update role");
      showToast("Unable to update role");
      return;
    }
    setProfiles(prev => prev.map(profile => profile.id === profileId ? { ...profile, role: roleValue } : profile));
    setProfileStatus("ready");
    showToast("Role updated successfully");
  };

  return (
    <div className="main">
      <style>{css}</style>
      <div className="sidebar" style={{background: isGovt ? "#1A237E" : G.soil}}>
        <div style={{padding:"12px 12px 16px"}}>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontWeight:700,fontSize:13,color:"white"}}>{isGovt?"🏛️ Tamil Nadu Agri Dept":"⚙️ FarmConnect Admin"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{isGovt?"Read-only secure access":"Super Admin"}</div>
          </div>
        </div>
        <div className="sidebar-section" style={{color:"rgba(255,255,255,0.4)"}}>Menu</div>
        {nav.map(n=>(
          <button key={n.key}
            className={`sidebar-item${view===n.key?" active":""}`}
            style={view===n.key?{background:"rgba(255,255,255,0.15)",color:"white"}:{color:"rgba(255,255,255,0.65)"}}
            onClick={()=>setView(n.key)}>
            <span className="icon">{n.icon}</span>{n.label}
          </button>
        ))}
      </div>

      <div className="content">
        {view==="overview" && <>
          {isGovt ? (
            <div className="govt-header">
              <div className="govt-title">Government Revenue Dashboard</div>
              <div className="govt-sub">Tamil Nadu Agricultural Marketplace · Real-time read-only access · June 2024</div>
              <div className="govt-grid">
                <div className="govt-stat"><div className="govt-stat-val">₹{totalGST.toLocaleString()}</div><div className="govt-stat-lbl">GST Collected</div></div>
                <div className="govt-stat"><div className="govt-stat-val">{orders.length}</div><div className="govt-stat-lbl">Verified Txns</div></div>
                <div className="govt-stat"><div className="govt-stat-val">2,847</div><div className="govt-stat-lbl">Farmers Covered</div></div>
                <div className="govt-stat"><div className="govt-stat-val">₹{totalGMV.toLocaleString()}</div><div className="govt-stat-lbl">Total GMV</div></div>
              </div>
            </div>
          ) : (
            <>
              <div className="page-title">Platform Overview</div>
              <div className="page-subtitle">FarmConnect Admin · June 20, 2024</div>
            </>
          )}

          <div className="grid-4">
            <div className="card"><div className="card-title">Total GMV</div><div className="card-value">₹{totalGMV.toLocaleString()}</div><div className="card-delta">↑ 42% MoM</div></div>
            <div className="card"><div className="card-title">Platform Revenue (5%)</div><div className="card-value amber">₹{Math.round(totalGMV*0.05).toLocaleString()}</div><div className="card-delta">↑ 38% MoM</div></div>
            <div className="card"><div className="card-title">Govt GST Revenue</div><div className="card-value" style={{color:"#1D4ED8"}}>₹{totalGST.toLocaleString()}</div><div className="card-delta">Transparent · Auto-filed</div></div>
            <div className="card"><div className="card-title">Active Farmers</div><div className="card-value">2,847</div><div className="card-delta">↑ 312 this month</div></div>
          </div>

          <div className="flow">
            <div className="flow-node"><div className="flow-node-title">🏨 Buyer</div><div className="flow-node-sub">Pays ₹{totalGMV.toLocaleString()}</div></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node highlight"><div className="flow-node-title">🔒 Escrow</div><div className="flow-node-sub">FarmConnect holds</div></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node"><div className="flow-node-title">🌾 Farmer</div><div className="flow-node-sub">₹{Math.round(totalGMV*0.9).toLocaleString()} (90%)</div></div>
            <div className="flow-arrow">+</div>
            <div className="flow-node amber"><div className="flow-node-title">💳 Platform</div><div className="flow-node-sub">₹{Math.round(totalGMV*0.05).toLocaleString()} (5%)</div></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node" style={{background:"#1A237E",borderColor:"#1A237E"}}><div className="flow-node-title" style={{color:"white"}}>🏛️ Govt GST</div><div className="flow-node-sub" style={{color:"#90CAF9"}}>₹{totalGST.toLocaleString()}</div></div>
          </div>

          <div className="chart-wrap">
            <div className="chart-title">Monthly GMV (₹ Lakhs)</div>
            <div className="bar-chart">
              {CHART_DATA.map(d=>(
                <div className="bar-col" key={d.label}>
                  <div className="bar-val">₹{d.val}L</div>
                  <div className="bar" style={{height:`${(d.val/42)*100}%`}}/>
                  <div className="bar-lbl">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {view==="transactions" && <>
          <div className="page-title">All Transactions</div>
          <div className="page-subtitle">Complete audit trail · Every rupee tracked</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Txn ID</th><th>Buyer</th><th>Farmer</th><th>Produce</th><th>Amount</th><th>Farmer (90%)</th><th>Platform (5%)</th><th>GST</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {ORDERS.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontFamily:"'JetBrains Mono',monospace",color:G.leaf,fontSize:11}}>{o.id}</td>
                    <td style={{fontSize:11}}>{o.buyer}</td>
                    <td style={{fontSize:11}}>{o.farmer}</td>
                    <td>{o.produce}</td>
                    <td style={{fontWeight:600}}>₹{o.amount.toLocaleString()}</td>
                    <td style={{color:G.leaf}}>₹{Math.round(o.amount*0.9).toLocaleString()}</td>
                    <td style={{color:G.amber}}>₹{Math.round(o.amount*0.05).toLocaleString()}</td>
                    <td style={{color:"#1D4ED8"}}>₹{o.gst.toLocaleString()}</td>
                    <td style={{color:G.stone,fontSize:11}}>{o.date}</td>
                    <td><StatusPill s={o.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {!isGovt && view==="users" && <>
          <div className="page-title">User Access Control</div>
          <div className="page-subtitle">Manage who can enter the Farmer, Buyer, Admin, and Government dashboards</div>
          <div className="form-section">
            {profileStatus === "loading" && <div className="alert alert-blue">Loading user profiles…</div>}
            {profileStatus !== "loading" && profileStatus !== "ready" && (
              <div className="alert alert-amber">{profileStatus}</div>
            )}
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Email</th><th>Current Role</th><th>Change Role</th></tr></thead>
                <tbody>
                  {profiles.map(profile => (
                    <tr key={profile.id}>
                      <td>{profile.full_name || "Unnamed user"}</td>
                      <td style={{fontSize:12,color:G.stone}}>{profile.email || "—"}</td>
                      <td><span className="pill pill-blue"><span className="dot"/>{getRoleLabel(profile.role)}</span></td>
                      <td>
                        <select
                          className="form-select"
                          value={normalizeRoleValue(profile.role)}
                          onChange={(e) => updateUserRole(profile.id, e.target.value)}
                          disabled={updatingProfileId === profile.id}
                        >
                          <option value="buyer">Buyer</option>
                          <option value="farmer">Farmer</option>
                          <option value="admin">Admin</option>
                          <option value="govt">Government</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {view==="farmers" && <>
          <div className="page-title">Farmer Directory</div>
          <div className="page-subtitle">2,847 verified farmers across Tamil Nadu</div>
          <div className="grid-3">
            <div className="card"><div className="card-title">Coimbatore District</div><div className="card-value">847</div><div className="card-delta">↑ Most active</div></div>
            <div className="card"><div className="card-title">Erode District</div><div className="card-value">623</div><div className="card-delta">↑ Fast growing</div></div>
            <div className="card"><div className="card-title">Other Districts</div><div className="card-value">1,377</div><div className="card-delta">12 districts covered</div></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Farmer</th><th>Village</th><th>Crops</th><th>Monthly Income</th><th>Income Boost</th><th>Rating</th><th>Status</th></tr></thead>
              <tbody>
                {produceItems.map(p=>(
                  <tr key={p.id}>
                    <td style={{fontWeight:600}}>{p.farmer}</td>
                    <td>{p.village}</td>
                    <td>{p.name}</td>
                    <td style={{fontFamily:"'JetBrains Mono',monospace"}}>₹{(p.price*p.qty*0.1).toLocaleString()}</td>
                    <td style={{color:G.leaf,fontWeight:600}}>+16.7%</td>
                    <td>⭐ {p.rating}</td>
                    <td><span className="pill pill-green"><span className="dot"/>Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {view==="revenue" && isGovt && <>
          <div className="page-title">Tax Revenue Breakdown</div>
          <div className="page-subtitle">Transparent government income from FarmConnect transactions</div>
          <div className="alert alert-blue">🔒 This data is read-only. All taxes auto-filed to GSTN portal monthly by FarmConnect.</div>
          <div className="grid-3">
            <div className="card"><div className="card-title">GST Collected (18% on platform fee)</div><div className="card-value" style={{color:"#1D4ED8"}}>₹{totalGST.toLocaleString()}</div><div className="card-delta">This month</div></div>
            <div className="card"><div className="card-title">TDS Deducted (Farmers)</div><div className="card-value" style={{color:"#1D4ED8"}}>₹4,820</div><div className="card-delta">Auto-deposited to CBDT</div></div>
            <div className="card"><div className="card-title">Annual Tax Projection</div><div className="card-value" style={{color:"#1D4ED8"}}>₹6.3L</div><div className="card-delta">At current growth rate</div></div>
          </div>
          <div className="table-wrap">
            <div className="table-header"><div className="table-title">Transaction-level Tax Ledger</div><button className="btn btn-blue btn-sm" onClick={()=>showToast("Report exported!")}>⬇ Export</button></div>
            <table>
              <thead><tr><th>Txn ID</th><th>Date</th><th>Gross Amount</th><th>Platform Fee</th><th>GST @18%</th><th>GSTN Status</th></tr></thead>
              <tbody>
                {ORDERS.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#3B82F6"}}>{o.id}</td>
                    <td style={{color:G.stone,fontSize:12}}>{o.date} Jun</td>
                    <td>₹{o.amount.toLocaleString()}</td>
                    <td>₹{Math.round(o.amount*0.05).toLocaleString()}</td>
                    <td style={{fontWeight:700,color:"#1D4ED8"}}>₹{o.gst.toLocaleString()}</td>
                    <td><span className="pill pill-green"><span className="dot"/>Filed</span></td>
                  </tr>
                ))}
                <tr style={{background:G.mist,fontWeight:700}}>
                  <td colSpan={4} style={{textAlign:"right"}}>Total GST to Government:</td>
                  <td style={{color:"#1D4ED8",fontFamily:"'JetBrains Mono',monospace"}}>₹{totalGST.toLocaleString()}</td>
                  <td/>
                </tr>
              </tbody>
            </table>
          </div>
        </>}

        {view==="schemes" && isGovt && <>
          <div className="page-title">Scheme Impact Report</div>
          <div className="page-subtitle">Government scheme delivery tracked through FarmConnect</div>
          {[
            { scheme:"PM-KISAN", enrolled:1240, disbursed:"₹74.4L", pending:120, status:"Active" },
            { scheme:"Kisan Credit Card", enrolled:380, disbursed:"₹11.4 Cr credit", pending:45, status:"Active" },
            { scheme:"Soil Health Card", enrolled:2100, disbursed:"2,100 reports", pending:747, status:"Ongoing" },
            { scheme:"PMFBY Crop Insurance", enrolled:890, disbursed:"₹4.2L claims", pending:88, status:"Active" },
          ].map(s=>(
            <div className="form-section" key={s.scheme} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:"#1A237E"}}>{s.scheme}</div>
                  <div style={{fontSize:13,color:G.stone,marginTop:2}}>Enrolled: {s.enrolled} farmers · Pending: {s.pending}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:17,color:G.leaf,fontWeight:500}}>{s.disbursed}</div>
                  <span className="pill pill-green" style={{marginTop:4,display:"inline-flex"}}><span className="dot"/>{s.status}</span>
                </div>
              </div>
              <div style={{marginTop:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone,marginBottom:3}}>
                  <span>Enrollment rate</span><span>{Math.round(s.enrolled/(s.enrolled+s.pending)*100)}%</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{width:`${Math.round(s.enrolled/(s.enrolled+s.pending)*100)}%`}}/></div>
              </div>
            </div>
          ))}
        </>}

        {view==="compliance" && <>
          <div className="page-title">Compliance Center</div>
          <div className="page-subtitle">Legal framework status · All filings tracked</div>
          {[
            { name:"GST Filing (GSTR-1)", due:"25 Jul", status:"On Track", icon:"📋" },
            { name:"TDS Deposit (Farmers)", due:"7 Jul", status:"Completed", icon:"✅" },
            { name:"FSSAI License Renewal", due:"31 Aug", status:"On Track", icon:"🔄" },
            { name:"Annual IT Return", due:"31 Jul", status:"In Progress", icon:"📁" },
            { name:"DPDP Act Compliance Audit", due:"Quarterly", status:"Scheduled", icon:"🔒" },
            { name:"RBI Payment Aggregator KYC", due:"Ongoing", status:"Active", icon:"🏦" },
          ].map(c=>(
            <div key={c.name} style={{background:"white",border:`1px solid ${G.border}`,borderRadius:12,padding:"14px 18px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>{c.icon}</span>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>{c.name}</div>
                  <div style={{fontSize:12,color:G.stone}}>Due: {c.due}</div>
                </div>
              </div>
              <span className={`pill ${c.status==="Completed"||c.status==="Active"?"pill-green":c.status==="In Progress"||c.status==="Scheduled"?"pill-blue":"pill-amber"}`}>
                <span className="dot"/>{c.status}
              </span>
            </div>
          ))}
        </>}

        {view==="disputes" && <>
          <div className="page-title">Disputes</div>
          <div className="page-subtitle">0 open disputes · 3 resolved this month</div>
          <div className="empty">
            <div className="empty-icon">✅</div>
            <div className="empty-title">No Active Disputes</div>
            <div className="empty-desc">All transactions are running smoothly.<br/>Resolved disputes appear here with full audit trail.</div>
          </div>
        </>}
      </div>
      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState(null);
  const [supabaseStatus, setSupabaseStatus] = useState({ state: "checking" });
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profileRole, setProfileRole] = useState(null);
  const [signupRole, setSignupRole] = useState("buyer");

  useEffect(() => {
    let active = true;
    const checkSupabase = async () => {
      if (!supabase) {
        if (active) setSupabaseStatus({ state: "missing-config" });
        return;
      }
      const { error } = await supabase.from("produce_listings").select("id", { head: true, count: "exact" }).limit(1);
      if (active) {
        setSupabaseStatus(error ? { state: "tables-missing", error } : { state: "connected" });
      }
    };
    checkSupabase();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    const loadSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!active) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (!currentSession?.user) {
        setProfileRole(null);
        setRole(null);
        return;
      }

      const { data, error } = await supabase.from("profiles").select("role").eq("id", currentSession.user.id).maybeSingle();
      if (!active) return;
      if (error) {
        const fallbackRole = "buyer";
        setProfileRole(fallbackRole);
        setRole(fallbackRole);
        return;
      }
      const nextRole = normalizeRoleValue(data?.role);
      setProfileRole(nextRole);
      setRole(nextRole);
    };

    loadSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!active) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (!currentSession?.user) {
        setProfileRole(null);
        setRole(null);
        return;
      }
      if (_event === "SIGNED_IN") setAuthMessage("Signed in successfully.");
      if (_event === "SIGNED_OUT") {
        setProfileRole(null);
        setRole(null);
        setAuthMessage("Signed out.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setAuthMessage("Supabase is not configured yet. Add your URL and anon key first.");
      return;
    }
    if (!email || !password) {
      setAuthMessage("Please enter both email and password.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user) {
          await createProfileForUser({ id: data.user.id, email: data.user.email, fullName: email.split("@")[0], role: getRoleValueForSignup(signupRole) });
          setProfileRole(normalizeRoleValue(signupRole));
        }
        setAuthMessage("Account created. Check your email if confirmation is enabled.");
        setAuthMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthMessage("Signed in successfully.");
      }
    } catch (error) {
      setAuthMessage(error?.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setRole(null);
    setProfileRole(null);
    setAuthMessage("Signed out.");
  };

  const openRole = (nextRole) => {
    if (!session) {
      setAuthMessage("Please sign in first to enter the platform.");
      return;
    }
    if (profileRole && normalizeRoleValue(nextRole) !== profileRole) {
      setAuthMessage(`This account is assigned the ${getRoleLabel(profileRole)} role, so only that dashboard is available.`);
      return;
    }
    setRole(nextRole);
  };

  if (!role) {
    return (
      <div className="app">
        <style>{css}</style>
        {supabaseStatus.state !== "connected" && (
          <div style={{background: supabaseStatus.state === "missing-config" ? "#FFF7ED" : "#FEF3C7", color: "#92400E", padding: "10px 28px", fontSize: 13, borderBottom: "1px solid #FCD34D"}}>
            {supabaseStatus.state === "missing-config"
              ? "Supabase is not configured yet. Add your URL and anon key to .env."
              : "Supabase is configured, but the database tables are not created yet. Run the SQL from supabase-schema.sql in your Supabase SQL editor."}
          </div>
        )}
        <div className="topbar">
          <div className="topbar-brand">🌱 Farm<span>Connect</span></div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>India's Transparent Farm-to-Buyer Marketplace</div>
        </div>
        <div className="landing">
          <div className="landing-hero">
            <h1>From Soil<br/>to <em>Sale</em> — Direct</h1>
            <p>No middlemen. No hidden fees. Every rupee tracked transparently.<br/>FarmConnect connects Tamil Nadu's farmers directly to hotels, restaurants, and corporates.</p>
          </div>

          <div className="flow" style={{padding:"16px 24px",gap:12}}>
            <div className="flow-node"><div className="flow-node-title">🌾 Farmer</div><div className="flow-node-sub">Lists at ₹35/kg</div></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node highlight"><div className="flow-node-title">FarmConnect</div><div className="flow-node-sub">5% platform fee</div></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node"><div className="flow-node-title">🏨 Hotel</div><div className="flow-node-sub">Buys at ₹45/kg</div></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node amber"><div className="flow-node-title">🏛️ Govt</div><div className="flow-node-sub">GST collected</div></div>
          </div>

          <div className="form-section" style={{maxWidth: 460, width: "100%"}}>
            <div className="form-section-title">Supabase Authentication</div>
            {authMessage && (
              <div className={`alert ${authMessage.includes("success") || authMessage.includes("created") || authMessage.includes("Signed") ? "alert-green" : "alert-amber"}`}>
                {authMessage}
              </div>
            )}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button type="button" className={`btn ${authMode === "signin" ? "btn-primary" : "btn-outline"}`} onClick={()=>setAuthMode("signin")}>Sign In</button>
              <button type="button" className={`btn ${authMode === "signup" ? "btn-primary" : "btn-outline"}`} onClick={()=>setAuthMode("signup")}>Sign Up</button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              {authMode === "signup" && (
                <div className="form-group">
                  <label className="form-label">Choose access role</label>
                  <select className="form-select" value={signupRole} onChange={(e)=>setSignupRole(e.target.value)}>
                    <option value="buyer">Buyer</option>
                    <option value="farmer">Farmer</option>
                    <option value="admin">Admin</option>
                    <option value="govt">Government</option>
                  </select>
                </div>
              )}
              <button className="btn btn-primary" type="submit" disabled={authLoading}>
                {authLoading ? "Working..." : authMode === "signup" ? "Create Account" : "Sign In"}
              </button>
            </form>
            {session && user && (
              <div className="alert alert-green" style={{marginTop:12}}>
                Signed in as {user.email}
              </div>
            )}
            <div style={{fontSize:12,color:G.stone,marginTop:10}}>
              Supabase Auth is now active. Use this form to log in or create a new account before entering a dashboard.
            </div>
          </div>

          <div style={{textAlign:"center",marginTop:-20,marginBottom:8}}>
            <div style={{fontSize:13,color:G.stone}}>Choose your role to enter the platform</div>
          </div>

          {session && profileRole && (
            <div className="alert alert-blue" style={{maxWidth: 520, width: "100%"}}>
              Your account is assigned the {getRoleLabel(profileRole)} role. Only that dashboard is available right now.
            </div>
          )}

          <div className="role-cards">
            <div className="role-card farmer" onClick={()=>openRole("farmer")}>
              <div className="role-icon">🌾</div>
              <div className="role-title">Farmer</div>
              <div className="role-desc">List your produce, get fair prices, track earnings & govt schemes</div>
              <div className="role-tag">Sell Direct</div>
            </div>
            <div className="role-card buyer" onClick={()=>openRole("buyer")}>
              <div className="role-icon">🏨</div>
              <div className="role-title">Hotel / Buyer</div>
              <div className="role-desc">Browse fresh produce, place orders, download GST invoices</div>
              <div className="role-tag buyer-tag">Buy Fresh</div>
            </div>
            <div className="role-card admin" onClick={()=>openRole("admin")}>
              <div className="role-icon">⚙️</div>
              <div className="role-title">Admin Panel</div>
              <div className="role-desc">Full platform oversight, transactions, compliance & audit</div>
              <div className="role-tag admin-tag">FarmConnect HQ</div>
            </div>
            <div className="role-card" onClick={()=>openRole("govt")} style={{"--hover-color":"#3B82F6"}}>
              <div className="role-icon">🏛️</div>
              <div className="role-title">Government</div>
              <div className="role-desc">Read-only dashboard for tax data, scheme impact & farmer stats</div>
              <div className="role-tag" style={{background:"#EFF6FF",color:"#3B82F6"}}>TN Agri Dept</div>
            </div>
          </div>

          <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center",marginTop:8}}>
            {[["2,847","Verified Farmers"],["₹42L","Monthly GMV"],["16.7%","Farmer Income Boost"],["₹6,700","GST to Govt/Month"]].map(([v,l])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:500,color:G.soil}}>{v}</div>
                <div style={{fontSize:11,color:G.stone}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <style>{css}</style>
      {supabaseStatus.state !== "connected" && (
        <div style={{background: supabaseStatus.state === "missing-config" ? "#FFF7ED" : "#FEF3C7", color: "#92400E", padding: "10px 28px", fontSize: 13, borderBottom: "1px solid #FCD34D"}}>
          {supabaseStatus.state === "missing-config"
            ? "Supabase is not configured yet. Add your URL and anon key to .env."
            : "Supabase is configured, but the database tables are not created yet. Run the SQL from supabase-schema.sql in your Supabase SQL editor."}
        </div>
      )}
      <div className="topbar">
        <div className="topbar-brand">🌱 Farm<span>Connect</span></div>
        <div className="topbar-nav">
          <button className={`nav-btn${role==="farmer"?" active":""}`} onClick={()=>setRole("farmer")}>🌾 Farmer</button>
          <button className={`nav-btn${role==="buyer"?" active":""}`} onClick={()=>setRole("buyer")}>🏨 Buyer</button>
          <button className={`nav-btn${role==="admin"?" active":""}`} onClick={()=>setRole("admin")}>⚙️ Admin</button>
          <button className={`nav-btn${role==="govt"?" active":""}`} onClick={()=>setRole("govt")}>🏛️ Govt</button>
          <button className="nav-btn" onClick={()=>setRole(null)} style={{color:"rgba(255,255,255,0.4)"}}>← Home</button>
          {session && user && (
            <span className="nav-btn" style={{color:"rgba(255,255,255,0.85)", cursor:"default"}}>{user.email}</span>
          )}
          {session && (
            <button className="nav-btn" onClick={handleSignOut}>↪ Sign out</button>
          )}
        </div>
      </div>
      {role==="farmer" && <FarmerDashboard/>}
      {role==="buyer" && <BuyerDashboard/>}
      {role==="admin" && <AdminDashboard role="admin"/>}
      {role==="govt" && <AdminDashboard role="govt"/>}
    </div>
  );
}
