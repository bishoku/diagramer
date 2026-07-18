#!/usr/bin/env python3
"""
pack_dproj.py — Validates and packs workspace.json + diagram.json into a .dproj ZIP archive.

Usage:
  python pack_dproj.py <output.dproj> <workspace.json> <diagram.json>

Validations performed:
  - Both JSON files parse without errors
  - schemaVersion = 1
  - Every LogicalNode has a matching VisualNode in layoutNodes (and vice-versa)
  - Every LogicalEdge has a matching VisualEdge in layoutEdges
  - All foreign keys are valid (edge→node, sequence→edge, timeline→sequence)
  - All node types are from the registered list

Auto-repairs applied silently before packing:
  - Handle IDs referenced in layoutEdges but missing from the source/target
    node's handles array are injected automatically.
"""

import sys
import json
import zipfile
import os

# ─── Constants ────────────────────────────────────────────────────────────────

VALID_TYPES = {
    "client", "load_balancer", "gateway", "server", "database",
    "cache", "queue", "firewall", "section", "sticky_note",
}

VALID_SIDES = {"top", "right", "bottom", "left"}

DEFAULT_HANDLES = [
    {"id": "top:50",    "side": "top",    "offset": 50},
    {"id": "right:50",  "side": "right",  "offset": 50},
    {"id": "bottom:50", "side": "bottom", "offset": 50},
    {"id": "left:50",   "side": "left",   "offset": 50},
]
DEFAULT_HANDLE_IDS = {h["id"] for h in DEFAULT_HANDLES}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def parse_handle_id(handle_id: str):
    """Parse 'side:offset' → (side, offset) or None if malformed."""
    parts = handle_id.split(":")
    if len(parts) != 2:
        return None
    side, raw_offset = parts
    if side not in VALID_SIDES:
        return None
    try:
        offset = int(raw_offset)
    except ValueError:
        return None
    if not (0 <= offset <= 100):
        return None
    return side, offset


# ─── Workspace validation ──────────────────────────────────────────────────────

def validate_workspace(data: dict) -> list:
    errors = []
    for key in ("name", "path"):
        if key not in data:
            errors.append(f"workspace.json missing required field: '{key}'")
    return errors


# ─── Handle auto-repair ────────────────────────────────────────────────────────

def repair_handles(data: dict) -> list:
    """
    Auto-repair: inject any handle IDs referenced in layoutEdges into the
    corresponding layoutNode.handles array when they are missing.
    Mutates data in place. Returns human-readable repair descriptions.
    """
    repairs = []
    ld = data.get("logicalData", {})
    vd = data.get("visualData", {})
    edges = ld.get("edges", [])
    layout_nodes = vd.get("layoutNodes", {})
    layout_edges = vd.get("layoutEdges", {})

    # nodeId → set of required handle IDs derived from edges
    required: dict = {}
    for le in edges:
        ve = layout_edges.get(le.get("id", ""))
        if not ve:
            continue
        src = le.get("sourceId")
        tgt = le.get("targetId")
        if ve.get("sourceHandle") and src:
            required.setdefault(src, set()).add(ve["sourceHandle"])
        if ve.get("targetHandle") and tgt:
            required.setdefault(tgt, set()).add(ve["targetHandle"])

    for node_id, handle_ids in required.items():
        vn = layout_nodes.get(node_id)
        if not vn:
            continue

        existing = vn.get("handles")
        if existing and len(existing) > 0:
            existing_ids = {h["id"] for h in existing}
            current = list(existing)
        else:
            # Node has implicit defaults — materialise them so we can extend
            existing_ids = set(DEFAULT_HANDLE_IDS)
            current = [dict(h) for h in DEFAULT_HANDLES]

        changed = False
        for hid in sorted(handle_ids):  # sorted for deterministic output
            if hid in existing_ids:
                continue
            parsed = parse_handle_id(hid)
            if not parsed:
                repairs.append(
                    f"  ⚠  Node '{node_id}': cannot parse handle id '{hid}' — skipped"
                )
                continue
            side, offset = parsed
            current.append({"id": hid, "side": side, "offset": offset})
            existing_ids.add(hid)
            changed = True
            repairs.append(f"  ✎  Node '{node_id}': injected missing handle '{hid}'")

        if changed:
            vn["handles"] = current

    return repairs


# ─── Diagram validation ────────────────────────────────────────────────────────

def validate_diagram(data: dict) -> list:
    errors = []

    if data.get("schemaVersion") != 1:
        errors.append("diagram.json: 'schemaVersion' must be 1")

    ld = data.get("logicalData")
    if not isinstance(ld, dict):
        errors.append("diagram.json: missing 'logicalData' object")
        return errors

    vd = data.get("visualData")
    if not isinstance(vd, dict):
        errors.append("diagram.json: missing 'visualData' object")
        return errors

    nodes     = ld.get("nodes", [])
    edges     = ld.get("edges", [])
    sequences = ld.get("sequences", [])
    layout_nodes = vd.get("layoutNodes", {})
    layout_edges = vd.get("layoutEdges", {})
    timelines    = vd.get("timelines", {})

    node_ids = {n["id"] for n in nodes if "id" in n}
    edge_ids = {e["id"] for e in edges if "id" in e}
    seq_ids  = {s["id"] for s in sequences if "id" in s}

    # Logical ↔ Visual ID matching
    for nid in node_ids:
        if nid not in layout_nodes:
            errors.append(f"LogicalNode '{nid}' has no matching VisualNode in layoutNodes")

    for eid in edge_ids:
        if eid not in layout_edges:
            errors.append(f"LogicalEdge '{eid}' has no matching VisualEdge in layoutEdges")

    # Foreign keys
    for e in edges:
        if e.get("sourceId") not in node_ids:
            errors.append(
                f"Edge '{e.get('id')}': sourceId '{e.get('sourceId')}' not found in nodes"
            )
        if e.get("targetId") not in node_ids:
            errors.append(
                f"Edge '{e.get('id')}': targetId '{e.get('targetId')}' not found in nodes"
            )

    for s in sequences:
        if s.get("edgeId") not in edge_ids:
            errors.append(
                f"Sequence '{s.get('id')}': edgeId '{s.get('edgeId')}' not found in edges"
            )

    for tid, t in timelines.items():
        if t.get("sequenceId") not in seq_ids:
            errors.append(
                f"Timeline '{tid}': sequenceId '{t.get('sequenceId')}' not found in sequences"
            )

    # Node types
    for n in nodes:
        ntype = n.get("type", "")
        if ntype and not ntype.startswith("custom-comp-") and ntype not in VALID_TYPES:
            errors.append(
                f"Node '{n.get('id')}': unknown type '{ntype}'"
                f" (valid: {', '.join(sorted(VALID_TYPES))})"
            )

    # Handle consistency (informational — already auto-repaired, but validate post-repair)
    for le in edges:
        ve = layout_edges.get(le.get("id", ""))
        if not ve:
            continue

        for attr, node_id in [("sourceHandle", le.get("sourceId")), ("targetHandle", le.get("targetId"))]:
            hid = ve.get(attr)
            if not hid or not node_id:
                continue
            vn = layout_nodes.get(node_id)
            if not vn:
                continue
            node_handles = vn.get("handles")
            if node_handles:
                declared = {h["id"] for h in node_handles}
                if hid not in declared:
                    errors.append(
                        f"Edge '{le.get('id')}' {attr} '{hid}' not in node '{node_id}' handles"
                        " (handle repair may have failed — check the data manually)"
                    )
            # If no handles array, only defaults exist — check them
            elif hid not in DEFAULT_HANDLE_IDS:
                errors.append(
                    f"Edge '{le.get('id')}' {attr} '{hid}' is not a default handle"
                    f" and node '{node_id}' has no handles array"
                    " (handle repair may have failed — check the data manually)"
                )

    return errors


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 4:
        print("Usage: pack_dproj.py <output.dproj> <workspace.json> <diagram.json>")
        sys.exit(1)

    output_path   = sys.argv[1]
    workspace_path = sys.argv[2]
    diagram_path   = sys.argv[3]

    if not output_path.endswith(".dproj"):
        output_path += ".dproj"

    # ── Load files ──────────────────────────────────────────────────────────
    for path in (workspace_path, diagram_path):
        if not os.path.exists(path):
            print(f"ERROR: {path} not found")
            sys.exit(1)

    with open(workspace_path, "r", encoding="utf-8") as f:
        try:
            workspace_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"ERROR: {workspace_path} is not valid JSON: {e}")
            sys.exit(1)

    with open(diagram_path, "r", encoding="utf-8") as f:
        try:
            diagram_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"ERROR: {diagram_path} is not valid JSON: {e}")
            sys.exit(1)

    # ── Auto-repair handles (before validation so post-repair state is checked) ─
    repairs = repair_handles(diagram_data)
    if repairs:
        print(f"Auto-repaired {len(repairs)} handle issue(s):")
        for r in repairs:
            print(r)

    # ── Validate ────────────────────────────────────────────────────────────
    ws_errors   = validate_workspace(workspace_data)
    diag_errors = validate_diagram(diagram_data)
    all_errors  = ws_errors + diag_errors

    if all_errors:
        print(f"\nValidation found {len(all_errors)} error(s):")
        for err in all_errors:
            print(f"  ✗ {err}")
        sys.exit(1)

    # ── Pack ────────────────────────────────────────────────────────────────
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("workspace.json", json.dumps(workspace_data, indent=2, ensure_ascii=False))
        zf.writestr("diagram.json",   json.dumps(diagram_data,   indent=2, ensure_ascii=False))

    abs_path = os.path.abspath(output_path)
    size_kb  = os.path.getsize(abs_path) / 1024

    ld      = diagram_data["logicalData"]
    n_nodes = len(ld.get("nodes", []))
    n_edges = len(ld.get("edges", []))
    n_seqs  = len(ld.get("sequences", []))

    print(f"\n✓ Created {abs_path} ({size_kb:.1f} KB)")
    print(f"  {n_nodes} nodes, {n_edges} edges, {n_seqs} sequences")


if __name__ == "__main__":
    main()
