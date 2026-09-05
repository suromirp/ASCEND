import { describe, it, expect } from 'vitest';
import { identifyBaselineNeeds, identifyKnownCapabilities } from './goalSetupAssist';
import type { GoalRequirement } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';

const ASOF = '2026-09-09';

const distanceHiking: GoalRequirement[] = [
  { id: 'r1', kind: 'distance', scope: 'TOTAL_EVENT', target: { amount: 600, unit: 'km' }, discipline: 'hiking' },
];

describe('identifyBaselineNeeds', () => {
  it('flags every demanded key when there is zero evidence at all', () => {
    const needs = identifyBaselineNeeds(distanceHiking, [], ASOF);
    expect(needs.length).toBeGreaterThan(0);
    expect(needs.every((n) => n.confidence === 'unknown')).toBe(true);
    expect(needs.map((n) => n.key.dimension).sort()).toEqual(['endurance_duration', 'mechanical_tolerance']);
  });

  it('excludes a key once real evidence gives it medium/high confidence', () => {
    const evidence: CapabilityEvidence[] = [
      { id: 'e1', key: { dimension: 'endurance_duration', discipline: 'hiking' }, measured: { amount: 200, unit: 'min' }, date: '2026-08-20', evidenceType: 'manual', source: 'manualEntry' },
      { id: 'e2', key: { dimension: 'endurance_duration', discipline: 'hiking' }, measured: { amount: 180, unit: 'min' }, date: '2026-08-25', evidenceType: 'manual', source: 'manualEntry' },
    ];
    const needs = identifyBaselineNeeds(distanceHiking, evidence, ASOF);
    expect(needs.map((n) => n.key.dimension)).toEqual(['mechanical_tolerance']);
  });

  it('returns an empty array for a goal draft with no requirements at all', () => {
    expect(identifyBaselineNeeds([], [], ASOF)).toEqual([]);
  });

  it('a single recent data point only reaches medium confidence, not enough to silently drop the question a moment later, but is honestly excluded once it exists', () => {
    const evidence: CapabilityEvidence[] = [
      { id: 'e1', key: { dimension: 'mechanical_tolerance', discipline: 'hiking' }, measured: { amount: 150, unit: 'min' }, date: '2026-08-20', evidenceType: 'manual', source: 'manualEntry' },
    ];
    const needs = identifyBaselineNeeds(distanceHiking, evidence, ASOF);
    expect(needs.map((n) => n.key.dimension)).toEqual(['endurance_duration']);
  });
});

describe('identifyKnownCapabilities', () => {
  it('is the exact complement of identifyBaselineNeeds over the same demand set', () => {
    const evidence: CapabilityEvidence[] = [
      { id: 'e1', key: { dimension: 'endurance_duration', discipline: 'hiking' }, measured: { amount: 200, unit: 'min' }, date: '2026-08-20', evidenceType: 'manual', source: 'manualEntry' },
      { id: 'e2', key: { dimension: 'endurance_duration', discipline: 'hiking' }, measured: { amount: 180, unit: 'min' }, date: '2026-08-25', evidenceType: 'manual', source: 'manualEntry' },
    ];
    const needs = identifyBaselineNeeds(distanceHiking, evidence, ASOF);
    const known = identifyKnownCapabilities(distanceHiking, evidence, ASOF);
    expect(known.map((k) => k.key.dimension)).toEqual(['endurance_duration']);
    expect([...needs, ...known].length).toBe(2);
  });

  it('returns an empty array when nothing is demanded', () => {
    expect(identifyKnownCapabilities([], [], ASOF)).toEqual([]);
  });
});
