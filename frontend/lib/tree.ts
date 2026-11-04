import type { BlockNode, ElementDef } from "./types";

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export function createNode(type: string, defs: ElementDef[]): BlockNode {
  const def = defs.find((d) => d.type === type);
  const props: Record<string, unknown> = {};
  for (const p of def?.props || []) {
    if (p.type === "repeater") props[p.key] = structuredClone(p.default ?? []);
    else if (p.default !== undefined) props[p.key] = p.default;
  }
  const node: BlockNode = { id: uid(), type, props };
  if (type === "section" || type === "column") node.children = [];
  if (type === "columns") node.children = [createNode("column", defs), createNode("column", defs)];
  return node;
}

export function findHit(nodes: BlockNode[], id: string, parent: BlockNode | null = null):
  | { parent: BlockNode | null; index: number; list: BlockNode[] }
  | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return { parent, index: i, list: nodes };
    if (nodes[i].children?.length) {
      const hit = findHit(nodes[i].children!, id, nodes[i]);
      if (hit) return hit;
    }
  }
  return null;
}

function clone(nodes: BlockNode[]) {
  return structuredClone(nodes);
}

export function insertNode(tree: BlockNode[], selectedId: string | null, node: BlockNode) {
  const next = clone(tree);
  if (node.type === "section" || !selectedId) {
    next.push(node);
    return next;
  }
  const hit = findHit(next, selectedId);
  if (!hit) {
    next.push(node);
    return next;
  }
  const selected = hit.list[hit.index];
  if (selected.type === "section" || selected.type === "column") {
    selected.children = [...(selected.children || []), node];
    return next;
  }
  if (selected.type === "columns") {
    const col = selected.children?.[0];
    if (col) col.children = [...(col.children || []), node];
    else next.push(node);
    return next;
  }
  hit.list.splice(hit.index + 1, 0, node);
  return next;
}

export function moveNode(tree: BlockNode[], id: string, dir: -1 | 1) {
  const next = clone(tree);
  const hit = findHit(next, id);
  if (!hit) return tree;
  const j = hit.index + dir;
  if (j < 0 || j >= hit.list.length) return tree;
  const [item] = hit.list.splice(hit.index, 1);
  hit.list.splice(j, 0, item);
  return next;
}

export function removeNode(tree: BlockNode[], id: string) {
  const next = clone(tree);
  const hit = findHit(next, id);
  if (!hit) return tree;
  if (hit.parent?.type === "columns" && hit.list.length <= 1) return tree;
  hit.list.splice(hit.index, 1);
  return next;
}

export function updateProps(tree: BlockNode[], id: string, props: Record<string, unknown>) {
  const next = clone(tree);
  const hit = findHit(next, id);
  if (!hit) return tree;
  hit.list[hit.index].props = props;
  return next;
}

export function duplicateNode(tree: BlockNode[], id: string) {
  const next = clone(tree);
  const hit = findHit(next, id);
  if (!hit) return tree;
  const copy = retag(hit.list[hit.index]);
  hit.list.splice(hit.index + 1, 0, copy);
  return next;
}

function retag(n: BlockNode): BlockNode {
  return { ...n, id: uid(), props: structuredClone(n.props), children: n.children?.map(retag) };
}

export function setColumnCount(tree: BlockNode[], id: string, count: number, defs: ElementDef[]) {
  const next = clone(tree);
  const hit = findHit(next, id);
  if (!hit || hit.list[hit.index].type !== "columns") return tree;
  const node = hit.list[hit.index];
  const kids = node.children || [];
  while (kids.length < count) kids.push(createNode("column", defs));
  node.children = kids.slice(0, count);
  return next;
}
