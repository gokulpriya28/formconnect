import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  sanitizeText,
  validateEmail,
  validatePassword,
  passwordStrength,
  validatePrice,
  validateQty,
  validateFile,
  randomFileName,
} from "./src/security/sanitize.js";
import { rateLimiters, formatRetryTime, resetBucket } from "./src/security/rateLimiter.js";
import { logEvent, logLoginFailed, LOG_EVENTS } from "./src/security/logger.js";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const G = {
  soil:    "#1B4332",
  leaf:    "#2D6A4F",
  sprout:  "#40916C",
  field:   "#52B788",
  mist:    "#D8F3DC",
  amber:   "#E76F00",
  clay:    "#6B3F00",
  sky:     "#EEF4FF",
  ink:     "#1A1A1A",
  stone:   "#6B7280",
  cream:   "#FAFAF7",
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

  /* ── ROLE SELECTOR ── */
  .landing {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 48px 24px; gap: 40px;
  }
  .landing-hero { text-align: center; max-width: 560px; }
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
  .stats-bar { background: ${G.soil}; padding: 12px 28px; display: flex; gap: 32px; overflow-x: auto; }
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

  /* ── CARDS ── */
  .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; color: ${G.soil}; margin-bottom: 4px; }
  .page-subtitle { font-size: 14px; color: ${G.stone}; margin-bottom: 24px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .card { background: white; border: 1px solid ${G.border}; border-radius: 16px; padding: 20px; transition: box-shadow 0.15s; }
  .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
  .card-title { font-size: 12px; font-weight: 600; color: ${G.stone}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .card-value { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 500; color: ${G.soil}; }
  .card-value.amber { color: ${G.amber}; }
  .card-delta { font-size: 12px; color: #16A34A; margin-top: 4px; font-weight: 500; }
  .card-delta.neg { color: ${G.red}; }

  /* ── PRODUCE ── */
  .produce-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .produce-card { background: white; border: 1px solid ${G.border}; border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.18s ease; position: relative; }
  .produce-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(27,67,50,0.12); border-color: ${G.field}; }
  .produce-emoji { font-size: 52px; text-align: center; padding: 20px; background: ${G.mist}; line-height: 1; }
  .produce-body { padding: 14px; }
  .produce-name { font-weight: 700; font-size: 15px; color: ${G.ink}; }
  .produce-farmer { font-size: 12px; color: ${G.stone}; margin: 2px 0 8px; }
  .produce-price-row { display: flex; align-items: center; justify-content: space-between; }
  .produce-price { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 500; color: ${G.amber}; }
  .produce-unit { font-size: 11px; color: ${G.stone}; }
  .produce-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
  .badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; background: ${G.mist}; color: ${G.leaf}; }
  .badge.organic { background: #FEF3C7; color: #92400E; }
  .badge.express { background: #EDE9FE; color: #6D28D9; }
  .badge.verified { background: #D1FAE5; color: #065F46; }
  .badge.qty { background: #F0FDF4; color: ${G.leaf}; }
  .stock-bar { height: 4px; background: ${G.border}; border-radius: 2px; margin-top: 10px; }
  .stock-fill { height: 4px; background: ${G.field}; border-radius: 2px; }

  /* ── BUTTONS ── */
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; transition: all 0.15s ease; }
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
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

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
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
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
  .form-input { padding: 10px 14px; border: 1.5px solid ${G.border}; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 14px; color: ${G.ink}; transition: border-color 0.12s; background: white; outline: none; }
  .form-input:focus { border-color: ${G.field}; box-shadow: 0 0 0 3px rgba(82,183,136,0.15); }
  .form-input.error { border-color: ${G.red}; }
  .form-select { padding: 10px 14px; border: 1.5px solid ${G.border}; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 14px; color: ${G.ink}; background: white; outline: none; cursor: pointer; }
  .form-select:focus { border-color: ${G.field}; }
  .form-error { font-size: 11px; color: ${G.red}; margin-top: 2px; }
  .form-hint { font-size: 11px; color: ${G.stone}; margin-top: 2px; }

  /* ── PASSWORD STRENGTH ── */
  .pw-strength { margin-top: 6px; }
  .pw-strength-bar { display: flex; gap: 3px; margin-bottom: 4px; }
  .pw-strength-seg { height: 4px; flex: 1; border-radius: 2px; background: ${G.border}; transition: background 0.2s; }
  .pw-strength-seg.s0 { background: ${G.red}; }
  .pw-strength-seg.s1 { background: ${G.amber}; }
  .pw-strength-seg.s2 { background: #EAB308; }
  .pw-strength-seg.s3 { background: ${G.field}; }
  .pw-strength-seg.s4 { background: ${G.leaf}; }
  .pw-strength-label { font-size: 10px; }
  .pw-strength-label.s0, .pw-strength-label.s1 { color: ${G.red}; }
  .pw-strength-label.s2 { color: ${G.amber}; }
  .pw-strength-label.s3, .pw-strength-label.s4 { color: ${G.leaf}; }

  /* ── ALERTS ── */
  .alert { padding: 12px 16px; border-radius: 12px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 10px; }
  .alert-green { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
  .alert-amber { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
  .alert-blue { background: #DBEAFE; color: #1D4ED8; border: 1px solid #BFDBFE; }
  .alert-red { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }

  /* ── CONSENT BANNER ── */
  .consent-banner {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 500;
    background: ${G.soil}; color: white;
    padding: 16px 28px; display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.3);
  }
  .consent-banner p { font-size: 13px; opacity: 0.9; flex: 1; min-width: 200px; }
  .consent-banner a { color: ${G.field}; cursor: pointer; text-decoration: underline; }
  .consent-btns { display: flex; gap: 8px; }

  /* ── MODAL / OVERLAY ── */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); }
  .modal { background: white; border-radius: 24px; padding: 32px; max-width: 500px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
  .modal-lg { max-width: 680px; }
  .modal-title { font-family: 'DM Serif Display', serif; font-size: 24px; color: ${G.soil}; margin-bottom: 4px; }
  .modal-sub { font-size: 13px; color: ${G.stone}; margin-bottom: 20px; }
  .modal-produce-row { display: flex; align-items: center; gap: 14px; background: ${G.mist}; border-radius: 14px; padding: 14px; margin-bottom: 20px; }
  .modal-emoji { font-size: 40px; }
  .modal-detail-title { font-weight: 700; font-size: 16px; }
  .modal-detail-farm { font-size: 12px; color: ${G.stone}; }
  .order-summary { background: #FAFAFA; border: 1px solid ${G.border}; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .summary-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .summary-row.total { border-top: 1px solid ${G.border}; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 15px; }
  .summary-row.highlight { color: ${G.leaf}; }
  .summary-row.tax { color: ${G.stone}; font-size: 12px; }

  /* ── CHARTS ── */
  .chart-wrap { background: white; border: 1px solid ${G.border}; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
  .chart-title { font-weight: 700; font-size: 15px; color: ${G.ink}; margin-bottom: 16px; }
  .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; }
  .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .bar { border-radius: 6px 6px 0 0; width: 100%; background: ${G.field}; transition: all 0.3s; min-height: 4px; }
  .bar:hover { background: ${G.sprout}; }
  .bar-lbl { font-size: 10px; color: ${G.stone}; text-align: center; }
  .bar-val { font-size: 10px; color: ${G.leaf}; font-weight: 600; }

  /* ── FLOW ── */
  .flow { display: flex; align-items: center; gap: 8px; padding: 20px; background: ${G.mist}; border-radius: 16px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center; }
  .flow-node { background: white; border: 2px solid ${G.field}; border-radius: 12px; padding: 10px 16px; text-align: center; min-width: 90px; }
  .flow-node-title { font-weight: 700; font-size: 13px; color: ${G.soil}; }
  .flow-node-sub { font-size: 10px; color: ${G.stone}; }
  .flow-arrow { font-size: 20px; color: ${G.leaf}; }
  .flow-node.highlight { background: ${G.soil}; border-color: ${G.soil}; }
  .flow-node.highlight .flow-node-title { color: white; }
  .flow-node.highlight .flow-node-sub { color: ${G.field}; }
  .flow-node.amber { background: ${G.amber}; border-color: ${G.amber}; }
  .flow-node.amber .flow-node-title { color: white; }
  .flow-node.amber .flow-node-sub { color: #FFE0B2; }

  /* ── EMPTY ── */
  .empty { text-align: center; padding: 60px 20px; color: ${G.stone}; }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-title { font-size: 17px; font-weight: 600; color: ${G.ink}; margin-bottom: 6px; }
  .empty-desc { font-size: 13px; line-height: 1.6; }

  /* ── TOAST ── */
  .toast { position: fixed; bottom: 24px; right: 24px; z-index: 300; background: ${G.soil}; color: white; padding: 14px 20px; border-radius: 14px; font-size: 14px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 10px; max-width: 320px; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  /* ── PROGRESS ── */
  .progress-track { background: ${G.border}; border-radius: 4px; height: 8px; margin: 6px 0; }
  .progress-fill { height: 8px; border-radius: 4px; background: ${G.field}; }

  /* ── GOVT ── */
  .govt-header { background: linear-gradient(135deg, #1A237E 0%, #283593 100%); color: white; padding: 28px; border-radius: 16px; margin-bottom: 24px; }
  .govt-title { font-family: 'DM Serif Display', serif; font-size: 26px; margin-bottom: 4px; }
  .govt-sub { font-size: 13px; opacity: 0.7; }
  .govt-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; }
  .govt-stat { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; }
  .govt-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 500; }
  .govt-stat-lbl { font-size: 11px; opacity: 0.65; margin-top: 2px; }

  /* ── WALLET ── */
  .wallet-card { background: linear-gradient(135deg, ${G.soil} 0%, ${G.leaf} 100%); color: white; border-radius: 20px; padding: 28px; margin-bottom: 24px; position: relative; overflow: hidden; }
  .wallet-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; border-radius: 50%; background: rgba(255,255,255,0.06); }
  .wallet-label { font-size: 12px; opacity: 0.7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .wallet-amount { font-family: 'DM Serif Display', serif; font-size: 44px; margin: 4px 0; }
  .wallet-sub { font-size: 13px; opacity: 0.6; }

  /* ── SEARCH ── */
  .search-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; background: white; border: 1.5px solid ${G.border}; border-radius: 12px; padding: 8px 14px; }
  .search-icon { font-size: 16px; color: ${G.stone}; }
  .search-input { flex: 1; border: none; outline: none; font-family: 'Inter', sans-serif; font-size: 14px; color: ${G.ink}; background: transparent; }
  .filter-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .filter-chip { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1.5px solid ${G.border}; cursor: pointer; transition: all 0.12s; background: white; color: ${G.stone}; }
  .filter-chip.active { background: ${G.soil}; border-color: ${G.soil}; color: white; }
  .filter-chip:hover:not(.active) { border-color: ${G.leaf}; color: ${G.leaf}; }

  .section-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .section-head { font-weight: 700; font-size: 16px; color: ${G.ink}; }

  /* ── MFA ── */
  .mfa-card { background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%); color: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
  .mfa-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.2); border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 600; margin-bottom: 8px; }

  /* ── PRIVACY ── */
  .policy-content { max-height: 400px; overflow-y: auto; font-size: 13px; line-height: 1.8; color: ${G.ink}; }
  .policy-content h3 { color: ${G.soil}; font-size: 14px; margin: 16px 0 6px; }
  .policy-content p { margin-bottom: 10px; color: ${G.stone}; }
`;

// ─── DATA ────────────────────────────────────────────────────────
const CHART_DATA = [
  { label:"Jan", val:12 }, { label:"Feb", val:18 }, { label:"Mar", val:15 },
  { label:"Apr", val:28 }, { label:"May", val:35 }, { label:"Jun", val:42 },
];

const PRODUCTS = [
  { id:"p1", name:"Tomatoes", farmer:"Raman Patel", village:"Erode", emoji:"🍅", price:28, msP:22, unit:"kg", qty:800, organic:true, express:true, delivery:"Today", rating:4.9, reviews:24, category:"Vegetables" },
  { id:"p2", name:"Onions", farmer:"Murugan Swamy", village:"Coimbatore", emoji:"🧅", price:24, msP:18, unit:"kg", qty:1200, organic:false, express:true, delivery:"Today", rating:4.7, reviews:18, category:"Vegetables" },
  { id:"p3", name:"Potatoes", farmer:"Raman Patel", village:"Erode", emoji:"🥔", price:30, msP:25, unit:"kg", qty:600, organic:false, express:false, delivery:"Tomorrow", rating:4.8, reviews:15, category:"Vegetables" },
  { id:"p4", name:"Spinach", farmer:"Raman Patel", village:"Erode", emoji:"🥬", price:15, msP:12, unit:"bunch", qty:300, organic:true, express:true, delivery:"Today", rating:4.9, reviews:9, category:"Vegetables" },
  { id:"p5", name:"Mangoes", farmer:"Karthik Raja", village:"Salem", emoji:"🥭", price:80, msP:65, unit:"kg", qty:400, organic:true, express:false, delivery:"Tomorrow", rating:4.6, reviews:30, category:"Fruits" },
];

const ORDERS = [
  { id:"FC8492", produce:"Tomatoes", farmer:"Raman Patel", buyer:"Hotel Saravana Bhavan", qty:200, amount:5600, status:"delivered", date:"18 Jun", payment:"UPI", gst:50 },
  { id:"FC2940", produce:"Onions", farmer:"Murugan Swamy", buyer:"Anjappar Chettinad", qty:500, amount:11000, status:"in-transit", date:"19 Jun", payment:"UPI", gst:99 },
  { id:"FC1049", produce:"Potatoes", farmer:"Raman Patel", buyer:"Hotel Saravana Bhavan", qty:300, amount:7500, status:"confirmed", date:"20 Jun", payment:"UPI", gst:68 },
  { id:"FC7492", produce:"Spinach", farmer:"Raman Patel", buyer:"Sangeetha Veg", qty:100, amount:2000, status:"pending", date:"20 Jun", payment:"UPI", gst:18 },
  { id:"FC9301", produce:"Beans", farmer:"Murugan Swamy", buyer:"Anjappar Chettinad", qty:150, amount:4500, status:"delivered", date:"15 Jun", payment:"UPI", gst:41 },
];

const statusConfig = {
  delivered:   { cls:"pill-green",  icon:"✓",  label:"Delivered" },
  "in-transit":{ cls:"pill-blue",   icon:"🚛", label:"In Transit" },
  confirmed:   { cls:"pill-purple", icon:"✅", label:"Confirmed" },
  pending:     { cls:"pill-amber",  icon:"⏳", label:"Pending" },
};

// ─── HELPERS ─────────────────────────────────────────────────────
const computeQaScore = (p) => Math.min(100, Math.round(Number(p.rating ?? 4.8) * 20 + (p.organic ? 6 : 0) + (p.express ? 3 : 0) + (p.qty > 500 ? 2 : 0)));
const getQaGrade = (s) => s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "E";

const normalizeProduce = (row) => {
  const qs = Number(row.qa_score ?? row.qaScore ?? computeQaScore({ rating: Number(row.rating ?? 4.8), organic: Boolean(row.organic ?? true), express: Boolean(row.express ?? true), qty: Number(row.stock_quantity ?? row.qty ?? 0) }));
  return {
    id: row.id ?? row.listing_id,
    name: sanitizeText(row.name || row.produce || "Produce", 200),
    farmer: sanitizeText(row.users?.full_name || row.farmer || row.seller_name || "Local Farmer", 200),
    farmer_id: row.farmer_id || row.owner_id,
    village: sanitizeText(row.village || "Tamil Nadu", 100),
    emoji: row.emoji || "🌾",
    price: Number(row.price ?? 0),
    msP: Number(row.ms_p ?? row.price ?? 0),
    unit: sanitizeText(row.unit || "kg", 20),
    qty: Number(row.stock_quantity ?? row.qty ?? 0),
    organic: Boolean(row.organic ?? true),
    express: Boolean(row.express ?? true),
    delivery: sanitizeText(row.delivery || "Tomorrow", 50),
    rating: Number(row.rating ?? 4.8),
    reviews: Number(row.reviews ?? 10),
    category: sanitizeText(row.category || "Vegetables", 100),
    image_url: row.image_url || null,
    qaScore: qs,
    qaGrade: getQaGrade(qs),
    created_at: row.created_at,
  };
};

const normalizeOrder = (row) => ({
  id: row.id ?? `FC${Math.floor(Math.random()*9000)+1000}`,
  product_id: row.product_id,
  produce: sanitizeText(row.products?.name || row.produce || "Produce", 200),
  farmer: sanitizeText(row.farmer?.full_name || row.farmer || "Unknown Farmer", 200),
  buyer: sanitizeText(row.customer?.full_name || row.buyer || "Guest Buyer", 200),
  customer_id: row.customer_id,
  farmer_id: row.farmer_id,
  qty: Number(row.quantity ?? row.qty ?? 0),
  amount: Number(row.total_price ?? row.amount ?? 0),
  status: row.status || "pending",
  date: row.date || new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }),
  payment: sanitizeText(row.payment || "UPI", 50),
  gst: Number(row.gst ?? Math.round((row.total_price || row.amount || 0) * 0.05 * 0.18)),
  delivery_address: row.delivery_address || "Default Address",
  created_at: row.created_at,
});

const loadProduceFromSupabase = async (setter) => {
  if (!supabase) return;
  const { data, error } = await supabase.from("products").select("*, users(full_name)").order("created_at", { ascending: false });
  if (!error && data) setter(data.map(normalizeProduce));
};

const loadOrdersFromSupabase = async (setter) => {
  if (!supabase) return;
  const { data, error } = await supabase.from("orders").select("*, products(name), customer:users!customer_id(full_name), farmer:users!farmer_id(full_name)").order("created_at", { ascending: false });
  if (!error && data) setter(data.map(normalizeOrder));
};

const saveProduceToSupabase = async (payload) => {
  if (!supabase) return null;
  const { data: { user } = {} } = await supabase.auth.getUser();
  const dbPayload = {
    farmer_id: user?.id ?? null,
    name: sanitizeText(payload.name, 200),
    description: sanitizeText(payload.name, 500),
    price: Number(payload.price ?? 0),
    stock_quantity: Number(payload.qty ?? 0),
    unit: sanitizeText(payload.unit || "kg", 20),
    image_url: payload.image_url || null,
  };
  const { data, error } = await supabase.from("products").insert([dbPayload]).select("*, users(full_name)").single();
  if (!error && data) {
    await logEvent(LOG_EVENTS.PRODUCT_CREATE, { name: dbPayload.name }, user?.id);
  } else if (error) {
    console.error("Save produce error:", error);
  }
  return error ? null : normalizeProduce(data);
};

const saveOrderToSupabase = async (payload) => {
  if (!supabase) return null;
  const { data: { user } = {} } = await supabase.auth.getUser();
  const orderPayload = {
    customer_id: user?.id ?? null,
    farmer_id: payload.farmer_id,
    product_id: payload.product_id,
    quantity: Number(payload.qty),
    total_price: Number(payload.amount),
    status: payload.status || 'pending',
    delivery_address: payload.delivery_address || 'Default Address',
  };
  const { data, error } = await supabase.from("orders").insert([orderPayload]).select("*, products(name), customer:users!customer_id(full_name), farmer:users!farmer_id(full_name)").single();
  if (!error && data) {
    await logEvent(LOG_EVENTS.ORDER_PLACE, { produce: payload.produce, amount: payload.amount }, user?.id);
  } else if (error) {
    console.error("Save order error:", error);
  }
  return error ? null : normalizeOrder(data);
};

const createProfileForUser = async ({ id, email, fullName, role = "Buyer" }) => {
  if (!supabase || !id) return null;
  const profilePayload = {
    id,
    email: sanitizeText(email, 254),
    full_name: sanitizeText(fullName, 200),
    role,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" }).select("*").single();
  return error ? null : data;
};

const normalizeRoleValue = (value) => {
  const n = String(value || "").trim().toLowerCase();
  if (["farmer","farmerrole","grower"].includes(n)) return "farmer";
  if (["buyer","hotel","hotelbuyer","buyerrole"].includes(n)) return "buyer";
  if (["admin","administrator","superadmin","super-admin"].includes(n)) return "admin";
  if (["govt","government","govtrole","official"].includes(n)) return "govt";
  return "buyer";
};

const getRoleLabel = (value) => {
  const n = normalizeRoleValue(value);
  if (n === "farmer") return "Farmer";
  if (n === "admin") return "Admin";
  if (n === "govt") return "Government";
  return "Buyer";
};

const getRoleValueForSignup = (value) => {
  const n = normalizeRoleValue(value);
  if (n === "farmer") return "Farmer";
  if (n === "admin") return "Admin";
  if (n === "govt") return "Government";
  return "Buyer";
};

const ROLE_ACCESS = {
  buyer: {
    label: "Buyer",
    dashboardLabel: "Buyer Dashboard",
    icon: "🏨",
    description: "Browse fresh produce, place orders, download GST invoices",
    badge: "Buy Fresh",
    badgeStyle: { background: "#EFF6FF", color: "#3B82F6" },
    visibleRoles: ["buyer"],
    permittedRoles: ["buyer"],
    selfAssignable: true,
  },
  farmer: {
    label: "Farmer",
    dashboardLabel: "Farmer Dashboard",
    icon: "🌾",
    description: "List your produce, get fair prices, track earnings & govt schemes",
    badge: "Sell Direct",
    badgeStyle: { background: "#D8F3DC", color: "#1B4332" },
    visibleRoles: ["farmer"],
    permittedRoles: ["farmer"],
    selfAssignable: true,
  },
  admin: {
    label: "Admin",
    dashboardLabel: "Admin Dashboard",
    icon: "⚙️",
    description: "Full platform oversight, transactions, compliance & audit",
    badge: "FarmConnect HQ",
    badgeStyle: { background: "#FFF7ED", color: "#E76F00" },
    visibleRoles: ["admin", "govt"],
    permittedRoles: ["admin", "govt"],
    selfAssignable: false,
  },
  govt: {
    label: "Government",
    dashboardLabel: "Government Dashboard",
    icon: "🏛️",
    description: "Read-only dashboard for tax data, scheme impact & farmer stats",
    badge: "TN Agri Dept",
    badgeStyle: { background: "#EFF6FF", color: "#3B82F6" },
    visibleRoles: ["govt"],
    permittedRoles: ["govt"],
    selfAssignable: false,
  },
};

const getAllowedRolesForProfile = (profileRole) => {
  const normalized = normalizeRoleValue(profileRole);
  return ROLE_ACCESS[normalized]?.permittedRoles ?? [normalized];
};

const getVisibleRoleCards = (profileRole) => {
  if (!profileRole) return Object.keys(ROLE_ACCESS).map((role) => ({ role, ...ROLE_ACCESS[role] }));
  const normalized = normalizeRoleValue(profileRole);
  const visibleRoles = ROLE_ACCESS[normalized]?.visibleRoles ?? [normalized];
  return visibleRoles.map((role) => ({ role, ...ROLE_ACCESS[role] }));
};

const canAccessRole = (profileRole, targetRole) => {
  const normalizedProfileRole = normalizeRoleValue(profileRole);
  const normalizedTargetRole = normalizeRoleValue(targetRole);
  const allowedRoles = getAllowedRolesForProfile(normalizedProfileRole);
  return allowedRoles.includes(normalizedTargetRole);
};

// ─── PASSWORD STRENGTH BAR ────────────────────────────────────────
function PasswordStrengthBar({ password }) {
  const score = passwordStrength(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const color = `s${score}`;
  return password.length > 0 ? (
    <div className="pw-strength">
      <div className="pw-strength-bar">
        {[0,1,2,3].map(i => (
          <div key={i} className={`pw-strength-seg${i < score ? ` ${color}` : ""}`} />
        ))}
      </div>
      <div className={`pw-strength-label ${color}`}>{labels[score]}</div>
    </div>
  ) : null;
}

// ─── CONSENT BANNER ──────────────────────────────────────────────
function ConsentBanner({ onAccept, onViewPolicy, onViewTerms }) {
  return (
    <div className="consent-banner" role="dialog" aria-label="Privacy consent">
      <p>
        🍪 We use cookies strictly for authentication. No tracking, no ads.{" "}
        <a onClick={onViewPolicy}>Privacy Policy</a> &middot;{" "}
        <a onClick={onViewTerms}>Terms of Service</a>
      </p>
      <div className="consent-btns">
        <button className="btn btn-outline btn-sm" style={{color:"white",borderColor:"rgba(255,255,255,0.4)"}} onClick={onAccept}>
          Accept & Continue
        </button>
      </div>
    </div>
  );
}

// ─── PRIVACY POLICY MODAL ─────────────────────────────────────────
function PrivacyPolicyModal({ onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div className="modal-title">Privacy Policy</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{fontSize:11,color:G.stone,marginBottom:16}}>Last updated: July 2026 · FarmConnect Platform</div>
        <div className="policy-content">
          <h3>1. Data We Collect</h3>
          <p>We collect your email address, name, phone number (optional), role, and district when you register. We collect order data, product listings, and audit events when you use the platform. We do NOT collect browsing history, advertising identifiers, or location beyond your self-reported district.</p>
          <h3>2. How We Use Your Data</h3>
          <p>Your data is used solely to operate the FarmConnect marketplace: authenticate your account, display your listings/orders, calculate GST, and generate invoices. We do not sell, rent, or share your personal data with third parties except as required by Indian law (GST filing with GSTN).</p>
          <h3>3. Data Storage & Security</h3>
          <p>All data is stored in Supabase (PostgreSQL) hosted on AWS ap-south-1 (Mumbai). Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Row-Level Security is enforced so you can only access your own data.</p>
          <h3>4. Authentication & Tokens</h3>
          <p>We use JWT tokens for authentication managed by Supabase Auth. Tokens auto-expire and are securely stored in your browser. We never store your password — it is hashed using bcrypt before storage.</p>
          <h3>5. Cookies</h3>
          <p>We use only one essential cookie: your authentication session token. We use no tracking, analytics, or advertising cookies.</p>
          <h3>6. Your Rights (DPDP Act 2023)</h3>
          <p>Under the Digital Personal Data Protection Act 2023, you have the right to: access your data, correct inaccurate data, request data deletion, and withdraw consent. To exercise these rights, use "Delete My Account" in your profile settings or email us.</p>
          <h3>7. Data Retention</h3>
          <p>Active account data is retained as long as you maintain your account. Order and transaction records are retained for 7 years as required by GST law. When you delete your account, personal profile data is erased within 30 days; transactional records are anonymized.</p>
          <h3>8. Children's Privacy</h3>
          <p>FarmConnect is not intended for users under 18. We do not knowingly collect data from minors.</p>
          <h3>9. Contact</h3>
          <p>For privacy concerns: privacy@farmconnect.in | FarmConnect Agritech Pvt. Ltd., Chennai, Tamil Nadu.</p>
        </div>
        <button className="btn btn-primary" style={{marginTop:20,width:"100%"}} onClick={onClose}>I Understand</button>
      </div>
    </div>
  );
}

// ─── TERMS MODAL ──────────────────────────────────────────────────
function TermsModal({ onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div className="modal-title">Terms of Service</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="policy-content">
          <h3>1. Platform Overview</h3>
          <p>FarmConnect is a B2B agricultural marketplace connecting verified Tamil Nadu farmers with hotels, restaurants, and corporate buyers. By using this platform, you agree to these terms.</p>
          <h3>2. Account Eligibility</h3>
          <p>You must be 18+ and operate a legitimate agricultural business (as Farmer) or procurement entity (as Buyer) in India. Admin/Government roles are assigned by FarmConnect staff only.</p>
          <h3>3. Farmer Obligations</h3>
          <p>Farmers must list only authentic produce they own. Pricing must be honest. Quality certifications (Organic, FSSAI) must be valid. FarmConnect reserves the right to remove fraudulent listings and suspend accounts.</p>
          <h3>4. Buyer Obligations</h3>
          <p>Buyers must place orders in good faith. Cancellation after farmer confirmation may attract penalties. GST numbers provided must be valid.</p>
          <h3>5. Platform Fee & Payments</h3>
          <p>FarmConnect charges a 5% platform fee on each transaction (paid by Buyer). GST @ 18% applies on the platform fee. Farmer receives 90% of the order value. Payments are held in escrow and released upon delivery confirmation.</p>
          <h3>6. Prohibited Activities</h3>
          <p>Users must not: attempt to bypass authentication, submit false information, engage in price manipulation, use automated bots, or attempt to access other users' data.</p>
          <h3>7. Dispute Resolution</h3>
          <p>Disputes are resolved by FarmConnect Admin within 7 business days. Decisions are final. Refunds are processed within 3–5 business days.</p>
          <h3>8. Limitation of Liability</h3>
          <p>FarmConnect acts as a marketplace intermediary and is not liable for quality of produce, transportation delays, or force majeure events.</p>
          <h3>9. Governing Law</h3>
          <p>These terms are governed by the laws of India. Disputes are subject to the jurisdiction of courts in Chennai, Tamil Nadu.</p>
        </div>
        <button className="btn btn-primary" style={{marginTop:20,width:"100%"}} onClick={onClose}>I Agree</button>
      </div>
    </div>
  );
}

// ─── COMPONENTS ──────────────────────────────────────────────────
function StatusPill({ s }) {
  const c = statusConfig[s] || { cls:"pill-gray", icon:"·", label:s };
  return <span className={`pill ${c.cls}`}><span className="dot" />{c.label}</span>;
}

function OrderModal({ item, onClose, onOrder }) {
  const [qty, setQty] = useState(50);
  const [qtyError, setQtyError] = useState("");
  const subtotal = qty * item.price;
  const gst = Math.round(subtotal * 0.05 * 0.18);
  const platform = Math.round(subtotal * 0.05);
  const farmer = Math.round(subtotal * 0.90);
  const total = subtotal + gst;

  const handleQtyChange = (e) => {
    const v = Number(e.target.value);
    if (!validateQty(v)) { setQtyError("Quantity must be between 10 and 1,000,000"); return; }
    if (v < 10) { setQtyError("Minimum 10 units"); return; }
    if (v > item.qty) { setQtyError(`Max available: ${item.qty} ${item.unit}`); return; }
    setQtyError("");
    setQty(v);
  };

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
          <input className={`form-input${qtyError ? " error" : ""}`} type="number" value={qty} min={10} max={item.qty} onChange={handleQtyChange} />
          {qtyError && <div className="form-error">{qtyError}</div>}
          <div className="form-hint">Min 10 {item.unit} · Available: {item.qty} {item.unit}</div>
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
          <button className="btn btn-amber" onClick={() => !qtyError && onOrder(item, qty, total)} disabled={!!qtyError} style={{flex:2}}>
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
  const [listingErrors, setListingErrors] = useState({});
  const [produceItems, setProduceItems] = useState(PRODUCTS.filter(p => p.farmer.includes("Raman")));
  const [ordersData, setOrdersData] = useState(ORDERS);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadProduceFromSupabase(rows => { if (active && rows.length) setProduceItems(rows); });
      await loadOrdersFromSupabase(rows => { if (active && rows.length) setOrdersData(rows); });
    })();
    return () => { active = false; };
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };
  const myOrders = ordersData.filter(o => o.farmer.includes("Raman") || o.farmer.includes("Murugan"));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { valid, error } = validateFile(file);
    if (!valid) { setUploadError(error); setUploadFile(null); return; }
    setUploadError("");
    setUploadFile(file);
  };

  const validateListingForm = () => {
    const errors = {};
    if (!listingForm.produce) errors.produce = "Please select a produce";
    if (!validateQty(listingForm.qty) || Number(listingForm.qty) < 1) errors.qty = "Enter a valid quantity (1–1,000,000)";
    if (!validatePrice(listingForm.price) || Number(listingForm.price) < 1) errors.price = "Enter a valid price (₹1–₹999,999)";
    setListingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePublishListing = async () => {
    if (!validateListingForm()) return;
    let imageUrl = null;
    if (uploadFile && supabase) {
      setUploadProgress(true);
      const fileName = randomFileName(uploadFile);
      const { data } = await supabase.storage.from("product-images").upload(fileName, uploadFile, { upsert: false });
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
      setUploadProgress(false);
    }
    const payload = {
      name: sanitizeText(listingForm.produce, 200),
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
      image_url: imageUrl,
    };
    const saved = await saveProduceToSupabase(payload);
    if (saved) setProduceItems(prev => [saved, ...prev]);
    showToast(saved ? "Produce saved to Supabase ✓" : "Listing staged locally for demo");
    setView("listings");
  };

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
          <button key={n.key} className={`sidebar-item${view===n.key?" active":""}`} onClick={() => setView(n.key)}>
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
            <div className="card"><div className="card-title">Active Listings</div><div className="card-value">3</div><div className="card-delta">↑ 2 new this week</div></div>
            <div className="card"><div className="card-title">Pending Orders</div><div className="card-value amber">2</div><div className="card-delta">Needs action</div></div>
            <div className="card"><div className="card-title">Rating</div><div className="card-value">4.8★</div><div className="card-delta">32 reviews</div></div>
            <div className="card"><div className="card-title">Govt Schemes</div><div className="card-value">2</div><div className="card-delta">PM-KISAN eligible</div></div>
          </div>
          <div className="chart-wrap">
            <div className="chart-title">Monthly Income (₹000s)</div>
            <div className="bar-chart">
              {CHART_DATA.map(d => (
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
                {myOrders.map(o => (
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
                <label className="form-label">Produce Name *</label>
                <select className={`form-select${listingErrors.produce ? " error" : ""}`} value={listingForm.produce} onChange={e => setListingForm({...listingForm, produce: e.target.value})}>
                  <option value="">Select produce...</option>
                  {["Tomatoes","Onions","Potatoes","Spinach","Beans","Brinjal","Okra","Mango","Banana"].map(p => <option key={p}>{p}</option>)}
                </select>
                {listingErrors.produce && <div className="form-error">{listingErrors.produce}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select"><option>Vegetables</option><option>Fruits</option><option>Grains</option></select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Available Quantity (kg) *</label>
                <input className={`form-input${listingErrors.qty ? " error" : ""}`} type="number" placeholder="e.g. 500" value={listingForm.qty}
                  onChange={e => setListingForm({...listingForm, qty: e.target.value})} min={1} max={1000000} />
                {listingErrors.qty && <div className="form-error">{listingErrors.qty}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Your Price (₹/kg) *</label>
                <input className={`form-input${listingErrors.price ? " error" : ""}`} type="number" placeholder="e.g. 28" value={listingForm.price}
                  onChange={e => setListingForm({...listingForm, price: e.target.value})} min={1} max={999999} />
                {listingErrors.price && <div className="form-error">{listingErrors.price}</div>}
                <div className="form-hint">Current mandi rate: ~₹22/kg. Earn more here!</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Available From</label>
                <input className="form-input" type="date" value={listingForm.date} onChange={e => setListingForm({...listingForm, date: e.target.value})} />
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
              {["Organic Certified","Soil Health Card","FSSAI Grade A","Pesticide-Free","Drip Irrigated"].map(tag => (
                <label key={tag} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
                  <input type="checkbox" style={{accentColor:G.leaf}} /> {tag}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">📸 Produce Photo</div>
            <div className="form-group">
              <input id="file-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                style={{display:"none"}} onChange={handleFileChange} />
              <label htmlFor="file-upload" className="btn btn-outline" style={{cursor:"pointer",alignSelf:"flex-start"}}>
                📁 Choose Image
              </label>
              <div className="form-hint">JPEG, PNG, WebP, or GIF · Max 5 MB · File is renamed randomly before upload for security</div>
              {uploadError && <div className="form-error">⚠ {uploadError}</div>}
              {uploadFile && <div className="alert alert-green" style={{marginTop:8}}>✓ {uploadFile.name} selected ({(uploadFile.size/1024/1024).toFixed(1)} MB)</div>}
            </div>
          </div>

          <div style={{display:"flex",gap:12}}>
            <button className="btn btn-outline">Save as Draft</button>
            <button className="btn btn-primary" disabled={uploadProgress} onClick={handlePublishListing}>
              {uploadProgress ? "Uploading..." : "🚀 Publish Listing"}
            </button>
          </div>
        </>}

        {view==="listings" && <>
          <div className="page-title">My Listings</div>
          <div className="page-subtitle">3 active · 1 draft · 2 sold out</div>
          <div className="produce-grid">
            {produceItems.slice(0,4).map(p => (
              <div className="produce-card" key={p.id}>
                <div className="produce-emoji">{p.emoji}</div>
                <div className="produce-body">
                  <div className="produce-name">{p.name}</div>
                  <div className="produce-price-row">
                    <div><div className="produce-price">₹{p.price}</div><div className="produce-unit">per {p.unit}</div></div>
                    <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>Edit</button>
                  </div>
                  <div className="stock-bar"><div className="stock-fill" style={{width:`${(p.qty/1200)*100}%`}}/></div>
                  <div style={{fontSize:11,color:G.stone,marginTop:4}}>{p.qty} {p.unit} remaining</div>
                  <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone}}>
                    <span>QA Score</span><span style={{fontWeight:700,color:G.leaf}}>{p.qaScore}/100</span>
                  </div>
                  <div style={{marginTop:4,display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone}}>
                    <span>Grade</span><span style={{fontWeight:700,color:G.amber}}>Grade {p.qaGrade}</span>
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
                {myOrders.map(o => (
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
        </>}

        {view==="schemes" && <>
          <div className="page-title">Government Schemes</div>
          <div className="page-subtitle">Benefits you're eligible for as a verified farmer</div>
          <div className="alert alert-green">🎉 You're eligible for 2 schemes! Apply directly through FarmConnect.</div>
          {[
            { name:"PM-KISAN", dept:"Ministry of Agriculture", benefit:"₹6,000/year", status:"Eligible", desc:"Direct income support to small & marginal farmers." },
            { name:"Kisan Credit Card", dept:"NABARD / SBI", benefit:"Up to ₹3L credit at 4%", status:"Eligible", desc:"Working capital loan for farming needs." },
            { name:"Soil Health Card", dept:"State Agriculture Dept", benefit:"Free soil analysis", status:"Applied", desc:"Annual soil health report linked to your farm profile." },
            { name:"PMFBY Crop Insurance", dept:"Agriculture Insurance Co.", benefit:"Up to ₹2L coverage", status:"Check Eligibility", desc:"Crop loss insurance for weather, pest, and market fluctuations." },
          ].map(s => (
            <div className="form-section" key={s.name} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:G.soil}}>{s.name}</div>
                  <div style={{fontSize:11,color:G.stone,margin:"2px 0 8px"}}>{s.dept}</div>
                  <div style={{fontSize:13,color:G.ink}}>{s.desc}</div>
                  <div style={{marginTop:8,fontFamily:"'JetBrains Mono',monospace",fontSize:15,color:G.amber,fontWeight:500}}>{s.benefit}</div>
                </div>
                <div style={{textAlign:"right",minWidth:140}}>
                  <div style={{marginBottom:8}}><span className={`pill ${s.status==="Eligible"?"pill-green":s.status==="Applied"?"pill-blue":"pill-amber"}`}><span className="dot"/> {s.status}</span></div>
                  <button className={`btn btn-sm ${s.status==="Eligible"?"btn-primary":s.status==="Applied"?"btn-ghost":"btn-outline"}`} onClick={() => showToast(`${s.name} application submitted!`)}>
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
  const [orders, setOrders] = useState(ORDERS.filter(o => o.buyer.includes("Saravana")));
  const [produceItems, setProduceItems] = useState(PRODUCTS);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      await loadProduceFromSupabase(rows => { if (active && rows.length) setProduceItems(rows); });
      await loadOrdersFromSupabase(rows => { if (active && rows.length) setOrders(rows); });
    })();
    return () => { active = false; };
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const placeOrder = async (item, qty, total) => {
    try {
      setModal(null);
      showToast("Initializing secure checkout...");
      
      // 1. Create a pending order in the database first
      const newOrderPayload = {
        product_id: item.id,
        farmer_id: item.farmer_id,
        produce: sanitizeText(item.name, 200),
        farmer: sanitizeText(item.farmer, 200),
        qty, amount: total, status: "pending",
        payment: "Razorpay",
      };
      const savedOrder = await saveOrderToSupabase(newOrderPayload);
      if (!savedOrder) {
        showToast("Failed to stage order securely.");
        return;
      }

      setOrders([savedOrder, ...orders]); // Optimistically show pending order

      // 2. Request a Razorpay Order ID from our secure Edge Function
      const { data: rzpData, error: rzpError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: total, currency: 'INR', receipt: savedOrder.id }
      });
      
      if (rzpError || !rzpData) {
        console.error("Razorpay Error:", rzpError);
        showToast("Payment gateway initialization failed.");
        return;
      }

      // 3. Open Razorpay Checkout Window
      const options = {
        key: 'rzp_test_YourKeyHere', // TODO: User needs to replace with actual Test Key
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Transparent Marketplace",
        description: `Secure Escrow: ${qty} ${item.unit} of ${item.name}`,
        order_id: rzpData.id,
        handler: async function (response) {
          // On Success: Update order status to confirmed and save payment securely
          await supabase.from("orders").update({ status: 'confirmed' }).eq('id', savedOrder.id);
          await supabase.from("payments").insert([{
            order_id: savedOrder.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            amount: total,
            status: 'completed'
          }]);
          
          setOrders(prev => prev.map(o => o.id === savedOrder.id ? { ...o, status: 'confirmed' } : o));
          showToast(`Payment successful! Order confirmed.`);
          setView("orders");
        },
        theme: { color: "#22c55e" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
         showToast("Payment failed or was cancelled.");
      });
      rzp.open();
      
    } catch (err) {
      console.error(err);
      showToast("Error processing checkout.");
    }
  };

  const cats = ["All","Vegetables","Fruits","Other"];
  const filtered = produceItems.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(sanitizeText(search, 100).toLowerCase());
    const matchesFilter = filter === "All" ? true : filter === "express" ? p.express : filter === "organic" ? p.organic : p.category === filter;
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
        {nav.map(n => (
          <button key={n.key} className={`sidebar-item${view===n.key?" active":""}`} onClick={() => setView(n.key)}
            style={view===n.key?{background:"#EFF6FF",color:"#1D4ED8"}:{}}>
            <span className="icon">{n.icon}</span>{n.label}
            {n.key==="orders" && <span className="nav-badge" style={{background:"#3B82F6"}}>{orders.length}</span>}
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
            <input className="search-input" placeholder="Search tomatoes, onions, spinach..."
              value={search} onChange={e => setSearch(e.target.value.slice(0,100))} maxLength={100} />
            <button className="btn btn-sm btn-primary">Search</button>
          </div>
          <div className="filter-row">
            {cats.map(c => <button key={c} className={`filter-chip${filter===c?" active":""}`} onClick={() => setFilter(c)}>{c}</button>)}
            <button className={`filter-chip${filter==="express"?" active":""}`} onClick={() => setFilter("express")} style={filter==="express"?{background:"#6D28D9",borderColor:"#6D28D9",color:"white"}:{}}>⚡ Express Delivery</button>
            <button className={`filter-chip${filter==="organic"?" active":""}`} onClick={() => setFilter("organic")} style={filter==="organic"?{background:"#92400E",borderColor:"#92400E",color:"white"}:{}}>🌿 Organic Only</button>
          </div>
          <div className="produce-grid">
            {filtered.map(p => (
              <div className="produce-card" key={p.id} onClick={() => setModal(p)}>
                <div className="produce-emoji">{p.emoji}</div>
                <div className="produce-body">
                  <div className="produce-name">{p.name}</div>
                  <div className="produce-farmer">🌾 {p.farmer} · {p.village}</div>
                  <div className="produce-price-row">
                    <div><div className="produce-price">₹{p.price}</div><div className="produce-unit">per {p.unit}</div></div>
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
                    <span>QA Score</span><span style={{fontWeight:700,color:G.leaf}}>{p.qaScore}/100</span>
                  </div>
                  <div style={{marginTop:4,display:"flex",justifyContent:"space-between",fontSize:11,color:G.stone}}>
                    <span>Grade</span><span style={{fontWeight:700,color:G.amber}}>Grade {p.qaGrade}</span>
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
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{fontFamily:"'JetBrains Mono',monospace",color:"#3B82F6",fontSize:12}}>{o.id}</td>
                    <td>{o.produce}</td>
                    <td style={{fontSize:12}}>{o.farmer}</td>
                    <td>{o.qty} kg</td>
                    <td style={{fontWeight:600}}>₹{o.amount.toLocaleString()}</td>
                    <td style={{color:G.leaf,fontSize:12}}>₹{o.gst.toLocaleString()}</td>
                    <td style={{color:G.stone,fontSize:12}}>{o.date}</td>
                    <td><StatusPill s={o.status}/></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => showToast("Invoice downloaded!")}>🧾</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {view==="track" && <>
          <div className="page-title">Track Delivery</div>
          <div className="page-subtitle">Real-time status of your active orders</div>
          {orders.filter(o => o.status!=="delivered").map(o => (
            <div className="form-section" key={o.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:700}}>{o.produce} — {o.qty} kg</div>
                  <div style={{fontSize:12,color:G.stone}}>Order {o.id} · ₹{o.amount.toLocaleString()}</div>
                </div>
                <StatusPill s={o.status}/>
              </div>
              <div style={{display:"flex",gap:0,position:"relative"}}>
                {["Order Placed","Payment Secured","Farmer Confirmed","In Transit","Delivered"].map((step,i) => {
                  const stepOrder = ["confirmed","confirmed","confirmed","in-transit","delivered"];
                  const done = stepOrder.indexOf(o.status) >= i;
                  return (
                    <div key={step} style={{flex:1,textAlign:"center",position:"relative"}}>
                      <div style={{width:24,height:24,borderRadius:"50%",margin:"0 auto 6px",background:done?G.leaf:G.border,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,position:"relative",zIndex:1}}>
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
          {orders.filter(o => o.status==="delivered").map(o => (
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
                  <button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={() => showToast("Invoice PDF downloaded!")}>⬇ Download PDF</button>
                </div>
              </div>
            </div>
          ))}
        </>}
      </div>
      {modal && <OrderModal item={modal} onClose={() => setModal(null)} onOrder={placeOrder}/>}
      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}

// ─── ADMIN / GOVT DASHBOARD ──────────────────────────────────────
function AdminDashboard({ role }) {
  const [view, setView] = useState("overview");
  const [toast, setToast] = useState(null);
  const [orders, setOrders] = useState(ORDERS);
  const [produceItems, setProduceItems] = useState(PRODUCTS);
  const [profiles, setProfiles] = useState([]);
  const [profileStatus, setProfileStatus] = useState("loading");
  const [updatingProfileId, setUpdatingProfileId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const isGovt = role === "govt";
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    let active = true;
    (async () => {
      await loadProduceFromSupabase(rows => { if (active && rows.length) setProduceItems(rows); });
      await loadOrdersFromSupabase(rows => { if (active && rows.length) setOrders(rows); });
      if (!supabase || isGovt) return;
      const { data, error } = await supabase.from("profiles").select("id,email,full_name,role").order("created_at", { ascending: false });
      if (!active) return;
      if (!error && data) { setProfiles(data); setProfileStatus("ready"); }
      else { setProfiles([]); setProfileStatus(error?.message || "failed"); }
      // Load audit logs (admin only)
      const { data: logs } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
      if (active && logs) setAuditLogs(logs);
    })();
    return () => { active = false; };
  }, [isGovt]);

  const totalGMV = orders.reduce((s,o) => s+o.amount, 0);
  const totalGST = orders.reduce((s,o) => s+o.gst, 0);

  const updateUserRole = async (profileId, nextRole) => {
    if (!supabase) return;
    setUpdatingProfileId(profileId);
    const roleValue = getRoleValueForSignup(nextRole);
    const { error } = await supabase.from("profiles").update({ role: roleValue }).eq("id", profileId);
    setUpdatingProfileId(null);
    if (error) { setProfileStatus(error.message || "Unable to update role"); showToast("Unable to update role"); return; }
    setProfiles(prev => prev.map(p => p.id === profileId ? {...p, role: roleValue} : p));
    setProfileStatus("ready");
    await logEvent(LOG_EVENTS.ADMIN_ACTION, { action: "ROLE_CHANGE", target_user_id: profileId, new_role: roleValue });
    showToast("Role updated successfully");
  };

  const nav = isGovt ? [
    { key:"overview", icon:"🏛️", label:"Overview" },
    { key:"revenue", icon:"💰", label:"Tax Revenue" },
    { key:"farmers", icon:"🌾", label:"Farmer Data" },
    { key:"schemes", icon:"📋", label:"Scheme Impact" },
  ] : [
    { key:"overview", icon:"📊", label:"Overview" },
    { key:"transactions", icon:"💳", label:"All Transactions" },
    { key:"farmers", icon:"🌾", label:"Farmers" },
    { key:"users", icon:"👤", label:"Users" },
    { key:"audit", icon:"🔍", label:"Audit Logs" },
    { key:"disputes", icon:"⚠️", label:"Disputes" },
    { key:"compliance", icon:"📜", label:"Compliance" },
  ];

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
        {nav.map(n => (
          <button key={n.key} className={`sidebar-item${view===n.key?" active":""}`}
            style={view===n.key?{background:"rgba(255,255,255,0.15)",color:"white"}:{color:"rgba(255,255,255,0.65)"}}
            onClick={() => setView(n.key)}>
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
            <><div className="page-title">Platform Overview</div><div className="page-subtitle">FarmConnect Admin · June 20, 2024</div></>
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
              {CHART_DATA.map(d => (
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
                {orders.map(o => (
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
          <div className="page-subtitle">Manage role assignments · Admin/Govt roles cannot be self-assigned</div>
          <div className="alert alert-amber">⚠ Role changes are logged. Only assign Admin/Government roles to verified staff.</div>
          <div className="form-section">
            {profileStatus === "loading" && <div className="alert alert-blue">Loading user profiles…</div>}
            {profileStatus !== "loading" && profileStatus !== "ready" && <div className="alert alert-amber">{profileStatus}</div>}
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
                        <select className="form-select" value={normalizeRoleValue(profile.role)}
                          onChange={e => updateUserRole(profile.id, e.target.value)}
                          disabled={updatingProfileId === profile.id}>
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

        {!isGovt && view==="audit" && <>
          <div className="page-title">Audit Logs</div>
          <div className="page-subtitle">Security events · Login activity · Admin actions</div>
          <div className="alert alert-blue">🔒 Only Admin users can view audit logs. All sensitive fields are scrubbed.</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>User</th><th>Details</th><th>Time</th></tr></thead>
              <tbody>
                {auditLogs.length === 0 && (
                  <tr><td colSpan={4} style={{textAlign:"center",color:G.stone,padding:"32px"}}>No audit events yet. Events appear here as users interact with the platform.</td></tr>
                )}
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td><span className="pill pill-blue"><span className="dot"/>{log.event_type}</span></td>
                    <td style={{fontSize:11,color:G.stone}}>{log.user_id?.slice(0,8) || "system"}…</td>
                    <td style={{fontSize:11,color:G.stone,maxWidth:300}}>{JSON.stringify(log.payload || {}).slice(0,100)}</td>
                    <td style={{fontSize:11,color:G.stone}}>{log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {produceItems.map(p => (
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
            <div className="table-header"><div className="table-title">Transaction-level Tax Ledger</div><button className="btn btn-blue btn-sm" onClick={() => showToast("Report exported!")}>⬇ Export</button></div>
            <table>
              <thead><tr><th>Txn ID</th><th>Date</th><th>Gross Amount</th><th>Platform Fee</th><th>GST @18%</th><th>GSTN Status</th></tr></thead>
              <tbody>
                {orders.map(o => (
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
          ].map(s => (
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
          ].map(c => (
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
  const [authMessageType, setAuthMessageType] = useState("amber"); // 'green' | 'amber' | 'red'
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profileRole, setProfileRole] = useState(null);
  const [signupRole, setSignupRole] = useState("buyer");
  const [consentGiven, setConsentGiven] = useState(() => localStorage.getItem("fc_consent") === "1");
  const [showPolicy, setShowPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0); // seconds remaining
  const [pwErrors, setPwErrors] = useState([]);
  const [emailError, setEmailError] = useState("");
  // Idle timeout (30 min)
  const [idleWarning, setIdleWarning] = useState(false);
  const idleTimer = React.useRef(null);
  const idleWarnTimer = React.useRef(null);

  // ── Idle timeout ──────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    clearTimeout(idleWarnTimer.current);
    setIdleWarning(false);
    if (!session) return;
    idleWarnTimer.current = setTimeout(() => setIdleWarning(true), 25 * 60 * 1000);
    idleTimer.current = setTimeout(async () => {
      await supabase?.auth.signOut();
      setRole(null); setProfileRole(null);
      setAuthMessage("You were signed out due to inactivity."); setAuthMessageType("amber");
    }, 30 * 60 * 1000);
  }, [session]);

  useEffect(() => {
    const events = ["mousemove","keydown","click","touchstart"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
      clearTimeout(idleWarnTimer.current);
    };
  }, [resetIdleTimer]);

  // ── Supabase connection check ─────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) { if (active) setSupabaseStatus({ state: "missing-config" }); return; }
      const { error } = await supabase.from("products").select("id", { head: true, count: "exact" }).limit(1);
      if (active) setSupabaseStatus(error ? { state: "tables-missing", error } : { state: "connected" });
    })();
    return () => { active = false; };
  }, []);

  // ── Session management ───────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!active) return;
      setSession(s); setUser(s?.user ?? null);
      if (!s?.user) { setProfileRole(null); setRole(null); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", s.user.id).maybeSingle();
      if (!active) return;
      const nextRole = normalizeRoleValue(data?.role);
      setProfileRole(nextRole); setRole(nextRole);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s); setUser(s?.user ?? null);
      if (!s?.user) { setProfileRole(null); setRole(null); return; }
      if (_event === "SIGNED_IN") { setAuthMessage("Signed in successfully."); setAuthMessageType("green"); resetBucket("login"); }
      if (_event === "SIGNED_OUT") { setProfileRole(null); setRole(null); setAuthMessage("Signed out."); setAuthMessageType("amber"); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  // ── Rate limit countdown ──────────────────────────────────────
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const t = setInterval(() => setRateLimitCooldown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [rateLimitCooldown]);

  // ── Auth submit ───────────────────────────────────────────────
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) { setAuthMessage("Supabase is not configured yet."); setAuthMessageType("red"); return; }

    // Input validation
    if (!validateEmail(email)) { setEmailError("Enter a valid email address."); return; }
    setEmailError("");

    if (authMode === "signup") {
      const { valid, errors } = validatePassword(password);
      if (!valid) { setPwErrors(errors); return; }
      setPwErrors([]);
    }
    if (!password) { setAuthMessage("Please enter your password."); setAuthMessageType("amber"); return; }

    // Rate limiting
    const rl = rateLimiters.login();
    if (!rl.allowed) {
      const secs = Math.ceil(rl.retryAfterMs / 1000);
      setRateLimitCooldown(secs);
      setAuthMessage(`Too many attempts. Try again in ${formatRetryTime(rl.retryAfterMs)}.`);
      setAuthMessageType("red");
      await logEvent(LOG_EVENTS.RATE_LIMITED, { context: "login" });
      return;
    }

    setAuthLoading(true); setAuthMessage(""); setPwErrors([]);
    try {
      if (authMode === "signup") {
        const selectedRole = getRoleValueForSignup(signupRole).toLowerCase();
        const normalizedRole = selectedRole === 'buyer' ? 'customer' : selectedRole;
        
        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim().toLowerCase(), 
          password,
          options: {
            data: {
              full_name: email.split("@")[0],
              role: normalizedRole
            }
          }
        });
        
        if (error) throw error;
        if (data?.user) {
          // Supabase Database Trigger will automatically insert into public.users
          setProfileRole(normalizedRole);
          await logEvent(LOG_EVENTS.SIGNUP, { role: normalizedRole }, data.user.id);
        }
        setAuthMessage("Account created! Check your email to confirm your address before signing in."); setAuthMessageType("green");
        setAuthMode("signin");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) {
          await logLoginFailed(email);
          throw error;
        }
        await logEvent(LOG_EVENTS.LOGIN_SUCCESS, {}, data.user?.id);
        setAuthMessage("Signed in successfully."); setAuthMessageType("green");
      }
    } catch (error) {
      setAuthMessage(error?.message || "Authentication failed."); setAuthMessageType("red");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await logEvent(LOG_EVENTS.LOGOUT, {}, user?.id);
    await supabase.auth.signOut();
    setRole(null); setProfileRole(null); setAuthMessage("Signed out."); setAuthMessageType("amber");
  };

  const handleForgotPassword = async () => {
    if (!supabase) { setForgotStatus("Supabase not configured."); return; }
    const rl = rateLimiters.otp();
    if (!rl.allowed) { setForgotStatus(`Too many requests. Try again in ${formatRetryTime(rl.retryAfterMs)}.`); return; }
    if (!validateEmail(forgotEmail)) { setForgotStatus("Enter a valid email address."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    await logEvent(LOG_EVENTS.PASSWORD_RESET, { email_domain: forgotEmail.split("@")[1] });
    setForgotStatus(error ? error.message : "Password reset email sent! Check your inbox.");
  };

  const handleDeleteAccount = async () => {
    if (!supabase || !user) return;
    // Soft-delete: mark profile as deleted
    await supabase.from("profiles").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", user.id);
    await logEvent(LOG_EVENTS.ACCOUNT_DELETE, {}, user.id);
    await supabase.auth.signOut();
    setRole(null); setProfileRole(null);
    setAuthMessage("Your account has been marked for deletion. Data will be removed within 30 days per our Privacy Policy.");
    setAuthMessageType("amber");
    setShowDeleteAccount(false);
  };

  const openRole = (nextRole) => {
    if (!session) { setAuthMessage("Please sign in first to enter the platform."); setAuthMessageType("amber"); return; }

    const normalizedTargetRole = normalizeRoleValue(nextRole);
    const normalizedProfileRole = normalizeRoleValue(profileRole);

    if (profileRole && !canAccessRole(profileRole, normalizedTargetRole)) {
      setAuthMessage(`Your account is assigned the ${getRoleLabel(profileRole)} role. Only your permitted dashboard is available.`);
      setAuthMessageType("amber");
      return;
    }

    if (profileRole && normalizedProfileRole !== normalizedTargetRole) {
      setAuthMessage(`Your account is assigned the ${getRoleLabel(profileRole)} role. Only that dashboard is available.`);
      setAuthMessageType("amber");
      return;
    }

    logEvent(LOG_EVENTS.ROLE_SWITCH, { role: normalizedTargetRole }, user?.id);
    setRole(normalizedTargetRole);
  };

  const handleConsentAccept = () => {
    localStorage.setItem("fc_consent", "1");
    setConsentGiven(true);
    logEvent(LOG_EVENTS.CONSENT_GIVEN, {});
  };

  // ── Not signed in / Landing ───────────────────────────────────
  if (!role) {
    const pwStrength = passwordStrength(password);
    const pwStrengthLabel = ["","Weak","Fair","Good","Strong","Very Strong"][pwStrength];
    return (
      <div className="app">
        <style>{css}</style>
        {supabaseStatus.state !== "connected" && (
          <div style={{background: supabaseStatus.state === "missing-config" ? "#FFF7ED" : "#FEF3C7", color:"#92400E", padding:"10px 28px", fontSize:13, borderBottom:"1px solid #FCD34D"}}>
            {supabaseStatus.state === "missing-config"
              ? "⚙ Supabase is not configured yet. Add your URL and anon key to .env."
              : "⚙ Supabase is configured, but the database tables are not created yet. Run supabase-schema.sql in your Supabase SQL editor."}
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

          {/* ── Auth Form ── */}
          <div className="form-section" style={{maxWidth: 460, width: "100%"}}>
            <div className="form-section-title">🔐 Secure Authentication</div>

            {idleWarning && (
              <div className="alert alert-amber">⚠ You'll be signed out in 5 minutes due to inactivity. Move your mouse to stay logged in.</div>
            )}
            {authMessage && (
              <div className={`alert alert-${authMessageType}`}>{authMessage}</div>
            )}
            {rateLimitCooldown > 0 && (
              <div className="alert alert-red">🔒 Too many attempts. Try again in {rateLimitCooldown}s</div>
            )}

            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button id="btn-signin" type="button" className={`btn ${authMode==="signin"?"btn-primary":"btn-outline"}`} onClick={() => { setAuthMode("signin"); setPwErrors([]); setAuthMessage(""); }}>Sign In</button>
              <button id="btn-signup" type="button" className={`btn ${authMode==="signup"?"btn-primary":"btn-outline"}`} onClick={() => { setAuthMode("signup"); setPwErrors([]); setAuthMessage(""); }}>Sign Up</button>
            </div>

            <form onSubmit={handleAuthSubmit} autoComplete="on" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">Email</label>
                <input id="auth-email" className={`form-input${emailError ? " error" : ""}`} type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                  placeholder="you@example.com" autoComplete="email" required />
                {emailError && <div className="form-error">{emailError}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-password">Password</label>
                <input id="auth-password" className={`form-input${pwErrors.length ? " error" : ""}`} type="password" value={password}
                  onChange={e => { setPassword(e.target.value); setPwErrors([]); }}
                  placeholder={authMode === "signup" ? "Min 8 chars, uppercase, number, special char" : "Your password"}
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"} required />
                {authMode === "signup" && <PasswordStrengthBar password={password} />}
                {pwErrors.length > 0 && (
                  <div className="form-error">
                    Password must include: {pwErrors.join(", ")}
                  </div>
                )}
                {authMode === "signin" && (
                  <button type="button" style={{fontSize:12,color:G.leaf,background:"none",border:"none",cursor:"pointer",textAlign:"left",marginTop:4}}
                    onClick={() => setShowForgotPw(true)}>
                    Forgot password?
                  </button>
                )}
              </div>

              {authMode === "signup" && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-role">Your Role</label>
                    <select id="signup-role" className="form-select" value={signupRole} onChange={e => setSignupRole(e.target.value)}>
                      <option value="buyer">Buyer (Hotel / Restaurant / Corporate)</option>
                      <option value="farmer">Farmer (Grower / Cultivator)</option>
                      {/* Admin & Govt intentionally excluded — assigned by Admin only */}
                    </select>
                    <div className="form-hint">Admin and Government roles are assigned by FarmConnect staff only.</div>
                  </div>
                  <div style={{fontSize:12,color:G.stone,marginBottom:12,padding:"10px 12px",background:G.mist,borderRadius:8}}>
                    By creating an account you agree to our{" "}
                    <a style={{color:G.leaf,cursor:"pointer"}} onClick={() => setShowTerms(true)}>Terms of Service</a> and{" "}
                    <a style={{color:G.leaf,cursor:"pointer"}} onClick={() => setShowPolicy(true)}>Privacy Policy</a>.
                  </div>
                </>
              )}

              <button id="btn-auth-submit" className="btn btn-primary" type="submit"
                disabled={authLoading || rateLimitCooldown > 0} style={{width:"100%"}}>
                {authLoading ? "Working…" : authMode === "signup" ? "Create Account" : "Sign In"}
              </button>
            </form>

            {session && user && (
              <>
                <div className="alert alert-green" style={{marginTop:12}}>
                  ✓ Signed in as <strong>{user.email}</strong>
                </div>
                <button type="button" style={{fontSize:12,color:G.red,background:"none",border:"none",cursor:"pointer",textAlign:"left",marginTop:4}}
                  onClick={() => setShowDeleteAccount(true)}>
                  🗑 Request Account Deletion
                </button>
              </>
            )}

            <div style={{fontSize:12,color:G.stone,marginTop:10}}>
              🔒 Secured by Supabase Auth · bcrypt password hashing · JWT session tokens · Rate-limited sign-in
            </div>
          </div>

          {session && profileRole && (
            <div className="alert alert-blue" style={{maxWidth: 520, width: "100%"}}>
              Your account is assigned the <strong>{getRoleLabel(profileRole)}</strong> role. Only that dashboard is available.
            </div>
          )}

          <div className="role-cards">
            {getVisibleRoleCards(profileRole).map(({ role, label, icon, description, badge, badgeStyle }) => (
              <div
                key={role}
                className={`role-card ${role}`}
                onClick={() => openRole(role)}
                tabIndex={0}
                role="button"
                aria-label={`Enter ${label} dashboard`}
              >
                <div className="role-icon">{icon}</div>
                <div className="role-title">{label}</div>
                <div className="role-desc">{description}</div>
                <div className="role-tag" style={badgeStyle}>{badge}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center",marginTop:8}}>
            {[["2,847","Verified Farmers"],["₹42L","Monthly GMV"],["16.7%","Farmer Income Boost"],["₹6,700","GST to Govt/Month"]].map(([v,l]) => (
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:500,color:G.soil}}>{v}</div>
                <div style={{fontSize:11,color:G.stone}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Forgot Password Modal ── */}
        {showForgotPw && (
          <div className="overlay" onClick={e => e.target===e.currentTarget && setShowForgotPw(false)}>
            <div className="modal" style={{maxWidth:400}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div className="modal-title" style={{fontSize:20}}>Reset Password</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowForgotPw(false)}>✕</button>
              </div>
              <p style={{fontSize:13,color:G.stone,marginBottom:16}}>Enter your email and we'll send you a password reset link.</p>
              {forgotStatus && <div className={`alert ${forgotStatus.includes("sent") ? "alert-green" : "alert-amber"}`}>{forgotStatus}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email Address</label>
                <input id="forgot-email" className="form-input" type="email" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={handleForgotPassword}>Send Reset Email</button>
            </div>
          </div>
        )}

        {/* ── Delete Account Confirmation ── */}
        {showDeleteAccount && (
          <div className="overlay" onClick={e => e.target===e.currentTarget && setShowDeleteAccount(false)}>
            <div className="modal" style={{maxWidth:420}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div className="modal-title" style={{fontSize:20,color:G.red}}>Delete Account</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteAccount(false)}>✕</button>
              </div>
              <div className="alert alert-red">⚠ This will mark your account for deletion. All personal data will be erased within 30 days. Transaction records are anonymized as required by GST law.</div>
              <p style={{fontSize:13,color:G.stone,marginBottom:20}}>This action cannot be undone. Your listings and orders will be removed.</p>
              <div style={{display:"flex",gap:10}}>
                <button className="btn btn-outline" style={{flex:1}} onClick={() => setShowDeleteAccount(false)}>Cancel</button>
                <button className="btn btn-danger" style={{flex:1}} onClick={handleDeleteAccount}>Yes, Delete My Account</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Consent Banner ── */}
        {!consentGiven && <ConsentBanner onAccept={handleConsentAccept} onViewPolicy={() => setShowPolicy(true)} onViewTerms={() => setShowTerms(true)} />}

        {showPolicy && <PrivacyPolicyModal onClose={() => setShowPolicy(false)} />}
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      </div>
    );
  }

  return (
    <div className="app">
      <style>{css}</style>
      {supabaseStatus.state !== "connected" && (
        <div style={{background: supabaseStatus.state === "missing-config" ? "#FFF7ED" : "#FEF3C7", color:"#92400E", padding:"10px 28px", fontSize:13, borderBottom:"1px solid #FCD34D"}}>
          {supabaseStatus.state === "missing-config" ? "Supabase not configured." : "Supabase configured but tables missing. Run supabase-schema.sql."}
        </div>
      )}
      {idleWarning && (
        <div style={{background:"#FEF3C7",color:"#92400E",padding:"8px 28px",fontSize:13,borderBottom:"1px solid #FCD34D",textAlign:"center"}}>
          ⏱ You'll be signed out in 5 minutes due to inactivity. <button style={{background:"none",border:"none",color:G.leaf,cursor:"pointer",fontWeight:600}} onClick={resetIdleTimer}>Stay Logged In</button>
        </div>
      )}
      <div className="topbar">
        <div className="topbar-brand">🌱 Farm<span>Connect</span></div>
        <div className="topbar-nav">
          {getVisibleRoleCards(profileRole).map(({ role: roleKey, label, icon }) => (
            <button
              key={roleKey}
              className={`nav-btn${role===roleKey?" active":""}`}
              onClick={() => openRole(roleKey)}
            >
              {icon} {label}
            </button>
          ))}
          <button className="nav-btn" onClick={() => setRole(null)} style={{color:"rgba(255,255,255,0.4)"}}>← Home</button>
          {session && user && <span className="nav-btn" style={{color:"rgba(255,255,255,0.85)",cursor:"default"}}>{user.email}</span>}
          {session && <button className="nav-btn" onClick={handleSignOut}>↪ Sign out</button>}
        </div>
      </div>
      {role==="farmer" && <FarmerDashboard/>}
      {role==="buyer" && <BuyerDashboard/>}
      {role==="admin" && <AdminDashboard role="admin"/>}
      {role==="govt" && <AdminDashboard role="govt"/>}
    </div>
  );
}
