export function getGroomTunnelViewId(flags: Record<string, boolean>) {
  if (flags['groom-prop-jam-cleared'] || flags['groom-access-completed']) return 'cleared';
  if (flags['groom-prop-jam-reached']) return 'prop-jam';
  if (flags['groom-door-open']) return 'linda-flight';
  if (flags['groom-door-reached']) return 'door';
  if (flags['groom-tunnel-passage-open']) return 'main-open';
  return flags['groom-tunnel-entered'] ? 'entry' : 'exterior';
}
