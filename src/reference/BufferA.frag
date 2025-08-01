void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    bool useLeftPriority = (iFrame % 2 == 0);
    vec2 useLeftFactor = vec2(useLeftPriority ? 1.0 : -1.0, 1.0);

    Cell cellNeighborList[9];
    for(int iy = 0; iy < 3; iy++) {
        for(int ix = 0; ix < 3; ix++) {
            int i = iy * 3 + ix;
            float x = float(ix - 1);
            float y = float(iy - 1);
            vec2 offset = vec2(x, y) * useLeftFactor;
            vec2 uvNeighbor = (fragCoord + offset) / iResolution.xy;
            Cell cellNeighbor = unpackCell(texture(iChannel0, uvNeighbor));
            cellNeighborList[i] = cellNeighbor;
        }
    }
    Cell cellSelf = cellNeighborList[1 * 3 + 1];

    Cell cellUp = cellNeighborList[2 * 3 + 1];
    Cell cellFirstDiagonalUp = cellNeighborList[2 * 3 + 0];
    Cell cellFirstSideUp = cellNeighborList[1 * 3 + 0];
    Cell cellSecondDiagonalUp = cellNeighborList[2 * 3 + 2];
    Cell cellSecondSideUp = cellNeighborList[1 * 3 + 2];

    Cell cellDown = cellNeighborList[0 * 3 + 1];
    Cell cellFirstDiagonalDown = cellNeighborList[0 * 3 + 2];
    Cell cellFirstSideDown = cellNeighborList[1 * 3 + 2];
    Cell cellSecondDiagonalDown = cellNeighborList[0 * 3 + 0];
    Cell cellSecondSideDown = cellNeighborList[1 * 3 + 0];

    Cell cellNext = cellSelf;

    if(cellSelf.type == TYPE_AIR) {
        // watch up
        if(cellUp.type == TYPE_SAND) {
            cellNext = cellUp;
        } else if(cellFirstDiagonalUp.type == TYPE_SAND && cellFirstSideUp.type != TYPE_AIR) {
            cellNext = cellFirstDiagonalUp;
        } else if(cellSecondDiagonalUp.type == TYPE_SAND && cellSecondSideUp.type != TYPE_AIR) {
            cellNext = cellSecondDiagonalUp;
        } else {
            // DO NOTHING
        }

    } else if(cellSelf.type == TYPE_SAND) {
        // watch down
        if(cellDown.type == TYPE_AIR) {
            cellNext.type = TYPE_AIR;
        } else if(cellFirstDiagonalDown.type == TYPE_AIR && cellFirstSideDown.type == TYPE_AIR) {
            cellNext.type = TYPE_AIR;
        } else if(cellSecondDiagonalDown.type == TYPE_AIR && cellSecondSideDown.type == TYPE_AIR) {
            cellNext.type = TYPE_AIR;
        } else {
            // DO NOTHING
        }
    } else {
        // DO NOTHING
    }

    if(iFrame < 5 || 0.0 < iMouse.z) {
        vec2 uvSelf = fragCoord / iResolution.xy;
        float luminance = toLuminance(texture(iChannel1, uvSelf).rgb);
        cellNext = getInitialCell(uvSelf, luminance);
    }
    fragColor = packCell(cellNext);
}