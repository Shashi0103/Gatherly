// Helper utility to parse and modify SDP to prioritize VP9 video codec and Opus audio codec
export const preferCodecs = (sdp) => {
  let lines = sdp.split('\r\n');
  
  let vp9Payload = null;
  let opusPayload = null;

  // Search for the payload numbers for VP9 and Opus
  for (let line of lines) {
    if (line.startsWith('a=rtpmap:')) {
      const match = line.match(/^a=rtpmap:(\d+)\s+(\w+)\/(\d+)/);
      if (match) {
        const payload = match[1];
        const codec = match[2].toUpperCase();
        
        if (codec === 'VP9') {
          vp9Payload = payload;
        } else if (codec === 'OPUS') {
          opusPayload = payload;
        }
      }
    }
  }

  // Rewrite m=video line if VP9 payload was found
  if (vp9Payload) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('m=video ')) {
        const parts = lines[i].split(' ');
        // Format: m=video <port> <proto> <fmt> ...
        // We want to extract formatting values (index 3 and onwards)
        const header = parts.slice(0, 3);
        let fmts = parts.slice(3);
        
        // Remove VP9 payload if it exists in the array, then insert it at index 0
        fmts = fmts.filter(f => f !== vp9Payload);
        fmts.unshift(vp9Payload);
        
        lines[i] = header.concat(fmts).join(' ');
        console.log(`Preferred Video Codec: VP9 (payload ID ${vp9Payload})`);
        break;
      }
    }
  }

  // Rewrite m=audio line if Opus payload was found
  if (opusPayload) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('m=audio ')) {
        const parts = lines[i].split(' ');
        const header = parts.slice(0, 3);
        let fmts = parts.slice(3);
        
        fmts = fmts.filter(f => f !== opusPayload);
        fmts.unshift(opusPayload);
        
        lines[i] = header.concat(fmts).join(' ');
        console.log(`Preferred Audio Codec: Opus (payload ID ${opusPayload})`);
        break;
      }
    }
  }

  return lines.join('\r\n');
};
