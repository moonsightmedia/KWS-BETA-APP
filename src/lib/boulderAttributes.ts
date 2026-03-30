import type { LucideIcon } from 'lucide-react';
import { Brain, Dumbbell, Gauge, Mountain, Move, Orbit, Palette, Sparkles, Users, Zap } from 'lucide-react';

import type { BoulderCommunityAttribute } from '@/types/community';

export const boulderAttributeIcons: Record<string, LucideIcon> = {
  powerful: Dumbbell,
  technical: Brain,
  mobile: Move,
  coordination: Orbit,
  slab: Mountain,
  dynamic: Zap,
  endurance: Gauge,
  partner_boulder: Users,
  dual_color: Palette,
};

export const boulderAttributeHints: Record<string, string> = {
  powerful: 'Kraft und Zug dominieren die Beta.',
  technical: 'Präzision und saubere Positionen sind entscheidend.',
  mobile: 'Beweglichkeit und Reichweite helfen deutlich.',
  coordination: 'Timing und Koordination stehen im Mittelpunkt.',
  slab: 'Plattenarbeit, Balance und Druck entscheiden.',
  dynamic: 'Explosive Bewegung ist gefragt.',
  endurance: 'Viele Züge oder lange Spannung machen den Unterschied.',
  partner_boulder: 'Der Boulder ist als Partnerproblem oder Team-Boulder gedacht.',
  dual_color: 'Die Linie nutzt bewusst Griffe aus zwei Farben.',
};

export function getBoulderAttributeIcon(attribute: Pick<BoulderCommunityAttribute, 'key'>) {
  return boulderAttributeIcons[attribute.key] || Sparkles;
}

export function getBoulderAttributeHint(attributeKey: string) {
  return boulderAttributeHints[attributeKey] || 'Setter-Merkmal für diesen Boulder.';
}
