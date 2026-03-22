"use client";

import type { Temple } from "@/lib/types";
import FeatureBadge from "@/components/FeatureBadge";

interface Props {
  temple: Temple;
}

export default function EngineeringPanel({ temple }: Props) {
  const eng = temple.engineering;

  if (!eng) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-20">&#9881;</div>
        <h3 className="text-lg font-medium text-stone-300">
          Engineering data not yet available
        </h3>
        <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
          Our data pipeline is gathering structural and engineering information
          for this temple from ASI, Wikidata, and Wikipedia. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasDimensions(eng) && (
        <Section title="Dimensions">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {eng.baseDimensions && (
              <Metric label="Base" value={`${eng.baseDimensions.width}m x ${eng.baseDimensions.depth}m`} />
            )}
            {eng.totalArea && <Metric label="Area" value={`${eng.totalArea} m²`} />}
            {eng.vimanaHeight && <Metric label="Vimana Height" value={`${eng.vimanaHeight}m`} />}
            {eng.vimanaLevels && <Metric label="Vimana Levels" value={`${eng.vimanaLevels}`} />}
            {eng.numMandapas && <Metric label="Mandapas" value={`${eng.numMandapas}`} />}
            {eng.numPillars && <Metric label="Pillars" value={`${eng.numPillars}`} />}
            {eng.wallThickness && <Metric label="Wall Thickness" value={`${eng.wallThickness}m`} />}
            {eng.maxSpan && <Metric label="Max Span" value={`${eng.maxSpan}m`} />}
            {eng.orientationDegrees !== undefined && <Metric label="Orientation" value={`${eng.orientationDegrees}°`} />}
            {eng.capstoneWeight && <Metric label="Capstone" value={`${eng.capstoneWeight} tons`} />}
          </dl>
        </Section>
      )}

      {hasStructural(eng) && (
        <Section title="Structural System">
          <div className="space-y-3">
            {eng.structuralSystem && <FieldRow label="System" value={eng.structuralSystem} />}
            {eng.joinerySystem && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-stone-500 w-24 flex-shrink-0 uppercase tracking-wider pt-0.5">Joinery</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-200">{eng.joinerySystem}</span>
                  <FeatureBadge tag={`technique:${eng.joinerySystem.toLowerCase().replace(/\s+/g, "-")}`} />
                </div>
              </div>
            )}
            {eng.mortarType && <FieldRow label="Mortar" value={eng.mortarType} />}
            {eng.foundationType && (
              <FieldRow label="Foundation" value={`${eng.foundationType}${eng.foundationDepth ? ` (${eng.foundationDepth}m deep)` : ""}`} />
            )}
            {eng.loadPathDescription && <FieldRow label="Load Path" value={eng.loadPathDescription} />}
          </div>
        </Section>
      )}

      {eng.constructionMaterials && eng.constructionMaterials.length > 0 && (
        <Section title="Materials">
          <div className="flex flex-wrap gap-2">
            {eng.constructionMaterials.map((mat) => (
              <FeatureBadge key={mat} tag={`material:${mat.toLowerCase().replace(/\s+/g, "-")}`} size="md" />
            ))}
          </div>
        </Section>
      )}

      {eng.constructionTechniques && eng.constructionTechniques.length > 0 && (
        <Section title="Construction Techniques">
          <div className="flex flex-wrap gap-2">
            {eng.constructionTechniques.map((tech) => (
              <FeatureBadge key={tech} tag={`technique:${tech.toLowerCase().replace(/\s+/g, "-")}`} size="md" />
            ))}
          </div>
          {eng.constructionPeriodYears && (
            <p className="text-sm text-stone-400 mt-3">
              Construction period: ~{eng.constructionPeriodYears} years
            </p>
          )}
        </Section>
      )}

      {hasWater(eng) && (
        <Section title="Water Engineering">
          {eng.waterFeatures && eng.waterFeatures.length > 0 && (
            <div className="space-y-2">
              {eng.waterFeatures.map((wf, i) => (
                <div key={i} className="flex items-start gap-3">
                  <FeatureBadge tag={`water:${wf.type.toLowerCase().replace(/\s+/g, "-")}`} />
                  <span className="text-sm text-stone-300">{wf.description}</span>
                </div>
              ))}
            </div>
          )}
          {eng.drainageSystem && (
            <p className="text-sm text-stone-300 mt-2">
              <span className="font-medium text-stone-200">Drainage:</span> {eng.drainageSystem}
            </p>
          )}
        </Section>
      )}

      {hasEnvironmental(eng) && (
        <Section title="Environmental Engineering">
          <div className="space-y-3">
            {eng.acousticProperties && <FieldRow label="Acoustics" value={eng.acousticProperties} />}
            {eng.lightingDesign && <FieldRow label="Lighting" value={eng.lightingDesign} />}
            {eng.thermalDesign && <FieldRow label="Thermal" value={eng.thermalDesign} />}
            {eng.ventilationSystem && <FieldRow label="Ventilation" value={eng.ventilationSystem} />}
            {eng.astronomicalAlignments && eng.astronomicalAlignments.length > 0 && (
              <div>
                <span className="text-xs text-stone-500 uppercase tracking-wider">Astronomical Alignments</span>
                <ul className="mt-1 space-y-1">
                  {eng.astronomicalAlignments.map((a, i) => (
                    <li key={i} className="text-sm text-stone-300">{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {hasClassification(eng) && (
        <Section title="Architectural Classification">
          <dl className="grid grid-cols-2 gap-4">
            {eng.planType && (
              <div>
                <dt className="text-xs text-stone-500 uppercase tracking-wider">Plan Type</dt>
                <dd className="mt-1">
                  <FeatureBadge tag={`plan:${eng.planType.toLowerCase().replace(/\s+/g, "-")}`} size="md" />
                </dd>
              </div>
            )}
            {eng.superstructureType && (
              <div>
                <dt className="text-xs text-stone-500 uppercase tracking-wider">Superstructure</dt>
                <dd className="text-sm text-stone-200 mt-0.5">{eng.superstructureType}</dd>
              </div>
            )}
            {eng.ceilingType && (
              <div>
                <dt className="text-xs text-stone-500 uppercase tracking-wider">Ceiling</dt>
                <dd className="text-sm text-stone-200 mt-0.5">{eng.ceilingType}</dd>
              </div>
            )}
            {eng.proportionalSystem && (
              <div>
                <dt className="text-xs text-stone-500 uppercase tracking-wider">Proportional System</dt>
                <dd className="text-sm text-stone-200 mt-0.5">{eng.proportionalSystem}</dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      {eng.uniqueFeatures && eng.uniqueFeatures.length > 0 && (
        <Section title="Unique Features">
          <ul className="space-y-1">
            {eng.uniqueFeatures.map((f, i) => (
              <li key={i} className="text-sm text-stone-300 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&#9670;</span>
                {f}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {eng.seismicFeatures && eng.seismicFeatures.length > 0 && (
        <Section title="Seismic Resilience">
          <ul className="space-y-1">
            {eng.seismicFeatures.map((f, i) => (
              <li key={i} className="text-sm text-stone-300">{f}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
      <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500 uppercase tracking-wider">{label}</dt>
      <dd className="text-lg font-bold text-white mt-0.5">{value}</dd>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-stone-500 w-24 flex-shrink-0 uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-sm text-stone-200">{value}</span>
    </div>
  );
}

function hasDimensions(eng: NonNullable<Temple["engineering"]>) {
  return eng.baseDimensions || eng.totalArea || eng.vimanaHeight || eng.numMandapas || eng.numPillars || eng.maxSpan || eng.capstoneWeight;
}

function hasStructural(eng: NonNullable<Temple["engineering"]>) {
  return eng.structuralSystem || eng.joinerySystem || eng.mortarType || eng.foundationType || eng.loadPathDescription;
}

function hasWater(eng: NonNullable<Temple["engineering"]>) {
  return (eng.waterFeatures && eng.waterFeatures.length > 0) || eng.drainageSystem;
}

function hasEnvironmental(eng: NonNullable<Temple["engineering"]>) {
  return eng.acousticProperties || eng.lightingDesign || eng.thermalDesign || eng.ventilationSystem || (eng.astronomicalAlignments && eng.astronomicalAlignments.length > 0);
}

function hasClassification(eng: NonNullable<Temple["engineering"]>) {
  return eng.planType || eng.superstructureType || eng.ceilingType || eng.proportionalSystem;
}
