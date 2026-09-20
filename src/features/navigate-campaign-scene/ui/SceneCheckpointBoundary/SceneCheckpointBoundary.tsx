import {useEffect, useState, type ReactNode} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import type {CampaignSceneBlock} from '../../../../entities/campaign-session/model/types';
import type {GalleryGameplayDefinition} from '../../../../entities/campaign-session/model/galleryGameplay';
import {ensureSceneCheckpoint, restoreSceneCheckpoint} from '../../model/sceneCheckpointStorage';
import {SceneCheckpointContext} from '../../model/sceneCheckpointContext';

interface Props {children: ReactNode; definition: GalleryGameplayDefinition; blocks: CampaignSceneBlock[]; sceneId: string}
export function SceneCheckpointBoundary({children, definition, blocks, sceneId}: Props) {
  const block = blocks.find((entry) => entry.sceneIds.includes(sceneId));
  const [readyBlock, setReadyBlock] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (block) ensureSceneCheckpoint(definition, blocks, block);
    setReadyBlock(block?.id ?? 'none');
  }, [block, blocks, definition]);
  if (readyBlock !== (block?.id ?? 'none')) return null;
  const restart = block ? () => {
    if (!restoreSceneCheckpoint(definition, blocks, block)) return;
    setRevision((value) => value + 1);
    navigate(`/campaign/${definition.campaignId}/play/${block.entrySceneId}`, {replace: true});
  } : undefined;
  return <SceneCheckpointContext.Provider key={`${revision}:${location.pathname}`} value={restart}>{children}</SceneCheckpointContext.Provider>;
}
