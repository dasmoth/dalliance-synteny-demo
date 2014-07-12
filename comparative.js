function _fetchMappingBlocks(mapping, chr, min, max, reverse) {
    return new Promise(function(resolve, reject) {
        mapping.sourceBlocksForRange(chr, min, max, function(srcBlocks) {
            var mb = [];
            for (var sbi = 0; sbi < srcBlocks.length; ++sbi) {
                var sb = srcBlocks[sbi];

                var mstart = mapping.mapPoint(sb.name, sb.start);
                var mend = mapping.mapPoint(sb.name, sb.end);

                if (!mstart || !mend)
                    continue;

                if (reverse) {
                    mb.push({
                        destChr: sb.name,
                        destMin: sb.start,
                        destMax: sb.end,
                        srcChr: mstart.seq,
                        srcMin: mstart.pos,
                        srcMax: mend.pos
                    });
                } else {
                    mb.push({
                        srcChr: sb.name,
                        srcMin: sb.start,
                        srcMax: sb.end,
                        destChr: mstart.seq,
                        destMin: mstart.pos,
                        destMax: mend.pos
                    });
                }
            }
            resolve(mb);
        });
    });
}


function refreshComparative(canvas, topd, topMappingName, bottomd, bottomMappingName) {
    var topMapping = topd.chains[topMappingName];
    var bottomMapping = bottomd.chains[bottomMappingName];

    Promise.all([_fetchMappingBlocks(topMapping, topd.chr, topd.viewStart|0, topd.viewEnd|0, false),
                 _fetchMappingBlocks(bottomMapping, bottomd.chr, bottomd.viewStart|0, bottomd.viewEnd|0, true)])
      .then(function(mbsl) {
        console.log(mbsl);

        canvas.width = human.tierHolder.offsetWidth;

        var g = canvas.getContext('2d');
        g.fillStyle = 'red';
        g.globalAlpha = 0.5;

        var covered = {};
        {
            var mbs = mbsl[0];
            

            for (var mbi = 0; mbi < mbs.length; ++mbi) {
                var mb = mbs[mbi];
                covered['' + mb.destMin + '_' + mb.destMax] = true;

                var tstart = (mb.destMin - topd.viewStart) * topd.scale;
                var tend = (mb.destMax -topd.viewStart) * topd.scale;

                if (mb.srcChr == bottomd.chr) {
                    var bstart = (mb.srcMin - bottomd.viewStart) * bottomd.scale;
                    var bend = (mb.srcMax - bottomd.viewStart) * bottomd.scale;

                    if (tend > 0 && tstart < canvas.width && bend > -1000 && bstart < canvas.width + 1000) {
                        g.beginPath();
                        g.moveTo(tstart, 0);
                        g.lineTo(tend, 0);
                        g.lineTo(bend, 200);
                        g.lineTo(bstart, 200);
                        g.lineTo(tstart, 0);
                        g.fill();
                    }
                } 
            }
        }


        {
            g.fillStyle = 'blue';
            var mbs = mbsl[1];
            

            for (var mbi = 0; mbi < mbs.length; ++mbi) {
                var mb = mbs[mbi];

                if (covered['' + mb.destMin + '_' + mb.destMax])
                    continue;

                var tstart = (mb.destMin - topd.viewStart) * topd.scale;
                var tend = (mb.destMax -topd.viewStart) * topd.scale;

                if (mb.srcChr == bottomd.chr) {
                    var bstart = (mb.srcMin - bottomd.viewStart) * bottomd.scale;
                    var bend = (mb.srcMax - bottomd.viewStart) * bottomd.scale;

                    if (tend > -1000 && tstart < canvas.width + 1000 && bend > -1000 && bstart < canvas.width + 1000) {
                        g.beginPath();
                        g.moveTo(tstart, 0);
                        g.lineTo(tend, 0);
                        g.lineTo(bend, 200);
                        g.lineTo(bstart, 200);
                        g.lineTo(tstart, 0);
                        g.fill();
                    }
                } 
            }
        }
      });
}

function syncComparative(topd, bottomd, mappingName) {
    var mapping = topd.chains[mappingName];
    mapping.sourceBlocksForRange(topd.chr, topd.viewStart|0, topd.viewEnd|0, function(srcBlocks) {
        var blocksBySource = {};
        for (var sbi = 0; sbi < srcBlocks.length; ++sbi) {
            var sb = srcBlocks[sbi];
            pusho(blocksBySource, sb.name, sb);
        }
        var mb = -1;
        var mc = null;
        for (var c in blocksBySource) {
            var b = blocksBySource[c];
            if (b.length > mb) {
                mb = b.length;
                mc = c;
            }
        }

        var cb = blocksBySource[mc];
        cb.sort(function(a, b) {return a.start - b.start});
        var midBlock = cb[(cb.length/2)|0];
        var midPoint = (midBlock.end + midBlock.start)/2;
        var topWidth = topd.viewEnd - topd.viewStart + 1;

        bottomd.setLocation(midBlock.name, (midPoint - topWidth/2)|0,  (midPoint + topWidth/2)|0);
    });
}