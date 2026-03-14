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
        <div className="text-4xl mb-3 opacity-30">&#9881;</div>
        <h3 className="text-lg font-medium text-stone-700">
          Engineering data not yet available
        </h3>
        <p className="text-sm text-stone-400 mt-1 max-w-md mx-auto">
          Our data pipeline is gathering structural and engineering information
          for this temple from ASI, Wikidata, and Wikipedia. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dimensions */}
      {hasDimensions(eng) && (
        <Section title="Dimensions">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {eng.baseDimensions && (
              <Metric
                label="Base"
                value={`${eng.baseDimensions.width}m × ${eng.baseDimensions.depth}m`}
              />
            )}
            {eng.totalArea && (
              <Metric label="Area" value={`${eng.totalArea} m²`} />
            )}
            {eng.vimanaHeight && (
              <Metric label="Vimana Height" value={`${eng.vimanaHeight}m`} />
            )}
            {eng.vimanaLevels && (
              <Metric label="Vimana Levels" value={`${eng.vimanaLevels}`} />
            )}
            {eng.numMandapas && (
              <Metric label="Mandapas" value={`${eng.numMandapas}`} />
            )}
            {eng.numPillars && (
              <Metric label="Pillars" value={`${eng.numPillars}`} />
            )}
            {eng.wallThickness && (
              <Metric label="Wall Thickness" value={`${eng.wallThickness}m`} />
            )}
            {eng.maxSpan && (
              <Metric label="Max Span" value={`${eng.maxSpan}m`} />
            )}
            {eng.orientationDegrees !== undefined && (
              <Metric
                label="Orientation"
                value={`${eng.orientationDegrees}°`}
              />
            )}
            {eng.capstoneWeight && (
              <Metric label="Capstone" value={`${eng.capstoneWeight} tons`} />
            )}
          </dl>
        </Section>
      )}

      {/* Structural System */}
      {hasStructural(eng) && (
        <Section title="Structural System">
          <div className="space-y-3">
            {eng.structuralSystem && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-stone-400 w-24 flex-shrink-0 uppercase tracking-wider pt-0.5">
                  System
                </span>
                <span className="text-sm text-stone-800">
                  {eng.structuralSystem}
                </span>
              </div>
            )}
            {eng.joinerySystem && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-stone-400 w-24 flex-shrink-0 uppercase tracking-wider pt-0.5">
                  Joinery
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-800">
                    {eng.joinerySystem}
                  </span>
                  <FeatureBadge
                    tag={`technique:${eng.joinerySystem.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                </div>
              </div>
            )}
            {eng.mortarType && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-stone-400 w-24 flex-shrink-0 uppercase tracking-wider pt-0.5">
                  Mortar
                </span>
                <span className="text-sm text-stone-800">{eng.mortarType}</span>
              </div>
            )}
            {eng.foundationType && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-stone-400 w-24 flex-shrink-0 uppercase tracking-wider pt-0.5">
                  Foundation
                </span>
                <span className="text-sm text-stone-800">
                  {eng.foundationType}
                  {eng.foundationDepth
                    ? ` (${eng.foundationDepth}m deep)`
                    : ""}
                </span>
              </div>
            )}
            {eng.loadPathDescription && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-stone-400 w-24 flex-shrink-0 uppercase tracking-wider pt-0.5">
                  Load Path
                </span>
                <span className="text-sm text-stone-800">
                  {eng.loadPathDescription}
                </span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Materials */}
      {eng.constructionMaterials && eng.constructionMaterials.length > 0 && (
        <Section title="Materials">
          <div className="flex flex-wrap gap-2">
            {eng.constructionMaterials.map((mat) => (
              <FeatureBadge
                key={mat}
                tag={`material:${mat.toLowerCase().replace(/\s+/g, "-")}`}
                size="md"
              />
            ))}
          </div>
        </Section>
      )}

      {/* Construction Techniques */}
      {eng.constructionTechniques && eng.constructionTechniques.length > 0 && (
        <Section title="Construction Techniques">
          <div className="flex flex-wrap gap-2">
            {eng.constructionTechniques.map((tech) => (
              <FeatureBadge
                key={tech}
                tag={`technique:${tech.toLowerCase().replace(/\s+/g, "-")}`}
                size="md"
              />
            ))}
          </div>
          {eng.constructionPeriodYears && (
            <p className="text-sm text-stone-600 mt-3">
              Construction period: ~{eng.constructionPeriodYears} years
            </p>
          )}
        </Section>
      )}

      {/* Water Engineering */}
      {hasWater(eng) && (
        <Section title="Water Engineering">
          {eng.waterFeatures && eng.waterFeatures.length > 0 && (
            <div className="space-y-2">
              {eng.waterFeatures.map((wf, i) => (
                <div key={i} className="flex items-start gap-3">
                  <FeatureBadge
                    tag={`water:${wf.type.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  <span className="text-sm text-stone-700">
                    {wf.description}
                  </span>
                </div>
              ))}
            </div>
          )}
          {eng.drainageSystem && (
            <p className="text-sm text-stone-700 mt-2">
              <span className="font-medium">Drainage:</span>{" "}
              {eng.drainageSystem}
            </p>
          )}
        </Section>
      )}

      {/* Environmental Engineering */}
      {hasEnvironmental(eng) && (
        <Section title="Environmental Engineering">
          <div className="space-y-3">
            {eng.acousticProperties && (
              <EnvRow label="Acoustics" value={eng.acousticProperties} />
            )}
            {eng.lightingDesign && (
              <EnvRow label="Lighting" value={eng.lightingDesign} />
            )}
            {eng.thermalDesign && (
              <EnvRow label="Thermal" value={eng.thermalDesign} />
            )}
            {eng.ventilationSystem && (
              <EnvRow label="Ventilation" value={eng.ventilationSystem} />
            )}
            {eng.astronomicalAlignments &&
              eng.astronomicalAlignments.length > 0 && (
                <div>
                  <span className="text-xs text-stone-400 uppercase tracking-wider">
                    Astronomical Alignments
                  </span>
                  <ul className="mt-1 space-y-1">
                    {eng.astronomicalAlignments.map((a, i) => (
                      <li key={i} className="text-sm text-stone-700">
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </Section>
      )}

      {/* Architectural Classification */}
      {hasClassification(eng) && (
        <Section title="Architectural Classification">
          <dl className="grid grid-cols-2 gap-4">
            {eng.planType && (
              <div>
                <dt className="text-xs text-stone-400 uppercase tracking-wider">
                  Plan Type
                </dt>
                <dd className="mt-0.5">
                  <FeatureBadge
                    tag={`plan:${eng.planType.toLowerCase().replace(/\s+/g, "-")}`}
                    size="md"
                  />
                </dd>
              </div>
            )}
            {eng.superstructureType && (
              <div>
                <dt className="text-xs text-stone-400 uppercase tracking-wider">
                  Superstructure
                </dt>
                <dd className="text-sm text-stone-800 mt-0.5">
                  {eng.superstructureType}
                </dd>
              </div>
            )}
            {eng.ceilingType && (
              <div>
                <dt className="text-xs text-stone-400 uppercase tracking-wider">
                  Ceiling
                </dt>
                <dd className="text-sm text-stone-800 mt-0.5">
                  {eng.ceilingType}
                </dd>
              </div>
            )}
            {eng.proportionalSystem && (
              <div>
                <dt className="text-xs text-stone-400 uppercase tracking-wider">
                  Proportional System
                </dt>
                <dd className="text-sm text-stone-800 mt-0.5">
                  {eng.proportionalSystem}
                </dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      {/* Unique Features */}
      {eng.uniqueFeatures && eng.uniqueFeatures.length > 0 && (
        <Section title="Unique Features">
          <ul className="space-y-1">
            {eng.uniqueFeatures.map((f, i) => (
              <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&#9670;</span>
                {f}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Seismic Features */}
      {eng.seismicFeatures && eng.seismicFeatures.length > 0 && (
        <Section title="Seismic Resilience">
          <ul className="space-y-1">
            {eng.seismicFeatures.map((f, i) => (
              <li key={i} className="text-sm text-stone-700">
                {f}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-400 uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-lg font-semibold text-stone-900 mt-0.5">{value}</dd>
    </div>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-stone-400 uppercase tracking-wider">
        {label}
      </span>
      <p className="text-sm text-stone-700 mt-0.5">{value}</p>
    </div>
  );
}

// Helper functions to check if sections have data
function hasDimensions(eng: NonNullable<Temple["engineering"]>) {
  return (
    eng.baseDimensions ||
    eng.totalArea ||
    eng.vimanaHeight ||
    eng.numMandapas ||
    eng.numPillars ||
    eng.maxSpan ||
    eng.capstoneWeight
  );
}

function hasStructural(eng: NonNullable<Temple["engineering"]>) {
  return (
    eng.structuralSystem ||
    eng.joinerySystem ||
    eng.mortarType ||
    eng.foundationType ||
    eng.loadPathDescription
  );
}

function hasWater(eng: NonNullable<Temple["engineering"]>) {
  return (
    (eng.waterFeatures && eng.waterFeatures.length > 0) || eng.drainageSystem
  );
}

function hasEnvironmental(eng: NonNullable<Temple["engineering"]>) {
  return (
    eng.acousticProperties ||
    eng.lightingDesign ||
    eng.thermalDesign ||
    eng.ventilationSystem ||
    (eng.astronomicalAlignments && eng.astronomicalAlignments.length > 0)
  );
}

function hasClassification(eng: NonNullable<Temple["engineering"]>) {
  return (
    eng.planType ||
    eng.superstructureType ||
    eng.ceilingType ||
    eng.proportionalSystem
  );
}
