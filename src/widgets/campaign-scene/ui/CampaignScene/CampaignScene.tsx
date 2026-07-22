import type {CSSProperties, ReactNode} from 'react';
import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import type {CampaignSessionScene} from '../../../../entities/campaign-session/model/types';
import {InspectableArtifact} from '../../../../entities/campaign-session/ui/InspectableArtifact/InspectableArtifact';
import {InspectableArtifactDialog} from '../../../../entities/campaign-session/ui/InspectableArtifactDialog/InspectableArtifactDialog';
import {useCampaignScene} from '../../../../features/navigate-campaign-scene/model/useCampaignScene';
import {SceneAdvanceControl} from '../../../../features/navigate-campaign-scene/ui/SceneAdvanceControl/SceneAdvanceControl';
import {resolveAsset} from '../../../../shared/lib/assets/resolveAsset';
import styles from './CampaignScene.module.css';

interface CampaignSceneProps {
  campaignId: string;
  campaignScenes: CampaignSessionScene[];
  backLabel?: string;
  backHref?: string;
  externalRevealedIds?: string[];
  externallyManagedIds?: string[];
  interactiveContent?: ReactNode;
  scene: CampaignSessionScene;
}

export function CampaignScene({
  campaignId,
  campaignScenes,
  backLabel,
  backHref,
  externalRevealedIds = [],
  externallyManagedIds = [],
  interactiveContent,
  scene,
}: CampaignSceneProps) {
  const {
    introRead,
    revealedInspectableIds,
    viewedInspectableIds,
    selectedInspectableId,
    exitAvailable,
    completeIntro,
    findInspectable,
    openInspectable,
    closeInspectable,
  } = useCampaignScene(campaignId, scene, campaignScenes, externalRevealedIds, externallyManagedIds);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [lastFoundId, setLastFoundId] = useState<string | null>(null);
  const [storyVisible, setStoryVisible] = useState(true);
  const inventoryArtifacts = useMemo(
    () => campaignScenes.flatMap((item) => item.inspectables),
    [campaignScenes],
  );
  const foundArtifacts = useMemo(
    () => inventoryArtifacts.filter((artifact) => revealedInspectableIds.includes(artifact.id)),
    [inventoryArtifacts, revealedInspectableIds],
  );
  const hasInspectables = scene.inspectables.length > 0;
  const storyPending = !hasInspectables || !introRead;
  const unviewedCount = foundArtifacts.filter((artifact) => !viewedInspectableIds.includes(artifact.id)).length;
  const selectedArtifact = inventoryArtifacts.find((artifact) => artifact.id === selectedInspectableId);
  const sceneStyle = {
    '--inventory-panel': `url("${resolveAsset('assets/concepts/campaigns/penisuela/ui/inventory-panel-alpha-v2.png')}")`,
    '--artifact-panel-frame': `url("${resolveAsset('assets/concepts/campaigns/penisuela/ui/universal-panel-frame.png')}")`,
  } as CSSProperties;

  useEffect(() => {
    if (!selectedInspectableId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInspectable();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeInspectable, selectedInspectableId]);

  useEffect(() => {
    if (!lastFoundId || selectedInspectableId) return;
    const timeoutId = window.setTimeout(() => setLastFoundId(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [lastFoundId, selectedInspectableId]);

  const findArtifact = (artifactId: string) => {
    findInspectable(artifactId);
    setLastFoundId(artifactId);
  };

  const lastFoundArtifact = scene.inspectables.find((artifact) => artifact.id === lastFoundId);

  return (
    <section className={styles.scene} style={sceneStyle} aria-label={scene.title}>
      <p className={styles.mobileNotice} role="note">
        <strong>Поверните экран</strong>
        <span>Сцена рассчитана на общий экран в альбомной ориентации.</span>
      </p>
      <div className={styles.canvas}>
        <div className={styles.stage}>
          {scene.backgroundLayout === 'portrait' ? (
            <img className={styles.backgroundBackdrop} src={resolveAsset(scene.background)} alt="" aria-hidden="true" />
          ) : null}
          <img
            className={`${styles.background} ${scene.backgroundLayout === 'portrait' ? styles.portraitBackground : ''}`}
            src={resolveAsset(scene.background)}
            alt={scene.alt}
          />
          <div className={styles.stageShade} aria-hidden="true" />
        </div>
        {backHref ? <Link className={styles.backLink} to={backHref}>{backLabel}</Link> : null}

        {interactiveContent ? interactiveContent : storyPending && storyVisible ? (
          <div className={styles.introduction}>
            <button
              className={styles.storyClose}
              type="button"
              onClick={() => setStoryVisible(false)}
              aria-label="Скрыть рассказ"
            >
              −
            </button>
            <div className={styles.storyCopy}>
              <p className={styles.eyebrow}>{scene.eyebrow}</p>
              <h1>{scene.title}</h1>
              <p className={styles.narrator}>Мастер</p>
              <p className={styles.readAloud}>{scene.readAloud}</p>
            </div>
            {scene.exit ? (
              <SceneAdvanceControl
                introRead={!hasInspectables}
                exitAvailable={!hasInspectables}
                exitLabel={scene.exit.label}
                exitHref={`/campaign/${campaignId}/play/${scene.exit.nextSceneId}`}
                introActionLabel={scene.introActionLabel}
                onCompleteIntro={completeIntro}
              />
            ) : null}
          </div>
        ) : storyPending ? (
          <button className={styles.storyToggle} type="button" onClick={() => setStoryVisible(true)}>
            Показать рассказ
          </button>
        ) : (
          <>
            <div className={styles.searchField} aria-label="Осмотр номера">
              {scene.inspectables
                .filter((artifact) => !revealedInspectableIds.includes(artifact.id))
                .map((artifact) => (
                  <InspectableArtifact
                    key={artifact.id}
                    artifact={artifact}
                    presentation="search"
                    onFind={() => findArtifact(artifact.id)}
                    onOpen={() => undefined}
                  />
                ))}
            </div>

            {storyVisible ? (
              <div className={`${styles.introduction} ${styles.searchDescription}`}>
                <button
                  className={styles.storyClose}
                  type="button"
                  onClick={() => setStoryVisible(false)}
                  aria-label="Скрыть описание сцены"
                >
                  −
                </button>
                <div className={`${styles.storyCopy} ${styles.searchStoryCopy}`}>
                  <p className={styles.eyebrow}>{scene.eyebrow}</p>
                  <h1>{scene.title}</h1>
                  <p className={styles.narrator}>Мастер</p>
                  <p className={styles.readAloud}>
                    {scene.readAloud}{scene.roomLegend ? ` ${scene.roomLegend}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <button className={styles.storyToggle} type="button" onClick={() => setStoryVisible(true)}>
                Вернуть рассказ мастера
              </button>
            )}

            {lastFoundArtifact && !selectedArtifact && !inventoryOpen ? (
              <p className={styles.foundNotice} role="status">Теперь у вас: {lastFoundArtifact.label}</p>
            ) : null}

            {exitAvailable && scene.exit?.presentation === 'control' ? (
              <Link
                className={styles.sceneExitControl}
                to={`/campaign/${campaignId}/play/${scene.exit.nextSceneId}`}
              >
                {scene.exit.label}
              </Link>
            ) : exitAvailable && scene.exit ? (
              <Link
                className={styles.doorExit}
                to={`/campaign/${campaignId}/play/${scene.exit.nextSceneId}`}
                aria-label={`${scene.exit.label} через служебную дверь`}
              />
            ) : null}
          </>
        )}

        {!inventoryOpen ? (
          <button
            className={`${styles.inventoryButton} ${unviewedCount ? styles.inventoryHasItems : ''}`}
            type="button"
            onClick={() => setInventoryOpen(true)}
            aria-expanded="false"
            aria-controls="scene-inventory"
            aria-label="Открыть инвентарь"
          >
            <img src={resolveAsset('assets/concepts/campaigns/penisuela/ui/inventory-bag-icon.png')} alt="" />
          </button>
        ) : null}

        {inventoryOpen ? (
          <aside className={styles.inventory} id="scene-inventory" aria-label="Инвентарь героев">
            <div className={styles.inventoryHeading}>
              <p>Инвентарь</p>
              <button type="button" onClick={() => setInventoryOpen(false)} aria-label="Закрыть инвентарь">×</button>
            </div>
            {foundArtifacts.length ? (
              <div className={styles.inventoryItems}>
                {foundArtifacts.map((artifact) => (
                  <InspectableArtifact
                    key={artifact.id}
                    artifact={artifact}
                    presentation="inventory"
                    onOpen={() => openInspectable(artifact.id)}
                  />
                ))}
              </div>
            ) : <p className={styles.emptyInventory}>Пока здесь пусто.</p>}
          </aside>
        ) : null}

        <p className={styles.liveRegion} aria-live="polite">
          {lastFoundArtifact ? `Найдено: ${lastFoundArtifact.label}. Предмет открыт и теперь хранится среди ваших находок.` : ''}
        </p>
      </div>

      {selectedArtifact ? (
        <InspectableArtifactDialog artifact={selectedArtifact} onClose={closeInspectable} />
      ) : null}
    </section>
  );
}
