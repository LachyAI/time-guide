"use client";

/**
 * Floating abstract background — nebula haze, stars, drifting orbs,
 * orbit ring, shooting stars. Pure CSS animation, fixed behind all
 * content, pointer-events none. Orbs/nebula tint toward --agent-color.
 */
export function CosmicBackground() {
  return (
    <div className="cosmic" aria-hidden="true">
      <div className="cosmic-nebula cosmic-nebula-1" />
      <div className="cosmic-nebula cosmic-nebula-2" />
      <div className="cosmic-stars" />
      <div className="cosmic-stars cosmic-stars-far" />
      <div className="cosmic-orb cosmic-orb-1" />
      <div className="cosmic-orb cosmic-orb-2" />
      <div className="cosmic-orb cosmic-orb-3" />
      <div className="cosmic-ring" />
      <div className="cosmic-shooting cosmic-shooting-1" />
      <div className="cosmic-shooting cosmic-shooting-2" />
      <div className="cosmic-shooting cosmic-shooting-3" />
    </div>
  );
}
