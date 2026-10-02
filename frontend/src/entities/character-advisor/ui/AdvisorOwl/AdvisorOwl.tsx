import {useId} from 'react';
import type {AdvisorMood} from '../../model/types';
import {useAdvisorSprite} from '../../model/useAdvisorSprite';
import {useAdvisorInteraction} from '../../model/useAdvisorInteraction';
import {advisorBranch, advisorClawsOutline, advisorSprites, advisorViewport, spriteGeometry} from '../../config/animations';
import styles from './AdvisorOwl.module.css';

export type AdvisorOwlProps = {
  image: string;
  mood: AdvisorMood;
};

export function AdvisorOwl({image, mood}: AdvisorOwlProps) {
  const interaction = useAdvisorInteraction(mood);
  const sprite = useAdvisorSprite(interaction.state, interaction.iteration);
  const clipId = useId();
  return (
    <button className={styles.owl} type="button" aria-label="Поприветствовать советника"
      disabled={sprite.failed} onPointerEnter={interaction.onPointerEnter}
      onPointerLeave={interaction.onPointerLeave} onFocus={interaction.onFocus}
      onBlur={interaction.onBlur} onClick={interaction.onClick}>
      {sprite.failed ? (
        <img className={styles.image} src={image} alt="" />
      ) : (
        <svg ref={sprite.element} className={styles.image} viewBox={advisorViewport}
          data-mood={interaction.state} data-frame={`${sprite.frame.row}:${sprite.frame.column}`}
          preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id={clipId}>
              <rect x={spriteGeometry.insetX} y={spriteGeometry.insetY}
                width={spriteGeometry.viewportWidth} height={spriteGeometry.viewportHeight} />
            </clipPath>
            <clipPath id={`${clipId}-claws`}>
              <polygon points={advisorClawsOutline} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <image href={advisorSprites} width={spriteGeometry.width * spriteGeometry.columns}
              height={spriteGeometry.height * spriteGeometry.rows}
              x={spriteGeometry.insetX - sprite.frame.x} y={spriteGeometry.insetY - sprite.frame.y}
              onLoad={sprite.onLoad} onError={sprite.onError} />
            <image href={advisorBranch} width={spriteGeometry.width} height={spriteGeometry.height}
              data-layer="branch" onError={sprite.onError} />
            <image href={advisorSprites} width={spriteGeometry.width * spriteGeometry.columns}
              height={spriteGeometry.height * spriteGeometry.rows}
              x={spriteGeometry.insetX - sprite.frame.x} y={spriteGeometry.insetY - sprite.frame.y}
              clipPath={`url(#${clipId}-claws)`} data-layer="claws" />
          </g>
        </svg>
      )}
    </button>
  );
}
