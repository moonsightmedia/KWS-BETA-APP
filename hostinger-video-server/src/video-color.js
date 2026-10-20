const HDR_TRANSFERS = new Set(['smpte2084', 'arib-std-b67']);
const unspecified = value => !value || ['unknown', 'unspecified', 'reserved'].includes(value);

export function isHdrVideo(stream) {
  return HDR_TRANSFERS.has(stream?.color_transfer)
    || (stream?.side_data_list || []).some(data => /DOVI|Dolby Vision|Mastering display|Content light level/i.test(data.side_data_type || ''));
}

/** Convert pixel values, not just tags. Ordinary SDR keeps the existing path. */
export function hdrToSdrFilter(stream) {
  if (!isHdrVideo(stream)) return null;
  // Dolby Vision profile 5 has no backwards-compatible PQ/HLG base layer.
  // Do not silently publish incorrect colors for unsupported/ambiguous inputs.
  const dolby = stream.side_data_list?.find(data => /DOVI|Dolby Vision/i.test(data.side_data_type || ''));
  if (!HDR_TRANSFERS.has(stream.color_transfer) || (dolby && Number(dolby.dv_profile) !== 8)) {
    throw new Error('Unsupported HDR color metadata: upload an SDR or compatible PQ/HLG video');
  }
  const defaults = [];
  // PQ/HLG camera uploads normally use BT.2020. Preserve explicit input tags;
  // only fill missing primaries/matrix/range needed by zscale.
  if (unspecified(stream.color_primaries)) defaults.push('color_primaries=bt2020');
  if (unspecified(stream.color_space)) defaults.push('colorspace=bt2020nc');
  if (unspecified(stream.color_range)) defaults.push('range=limited');
  return [
    ...(defaults.length ? [`setparams=${defaults.join(':')}`] : []),
    'zscale=t=linear:npl=100',
    'format=gbrpf32le',
    'zscale=p=bt709',
    'tonemap=tonemap=hable:desat=2',
    'zscale=t=bt709:m=bt709:r=limited',
    'format=yuv420p',
    // HDR mastering/Dolby side data must not advertise HDR on SDR pixels.
    'sidedata=mode=delete',
  ].join(',');
}
