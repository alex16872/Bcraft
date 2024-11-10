// Create a Noa engine instance
const noa = new Engine({
    debug: true,
    showFPS: true,
    inverseY: false,
    inverseX: false,
    chunkSize: 32,
    chunkAddDistance: 2.5,
    chunkRemoveDistance: 3.5,
    playerHeight: 1.8,
    playerWidth: 0.6,
    playerAutoStep: true,
    useAO: true,
    AOmultipliers: [0.93, 0.8, 0.5],
    manuallyControlChunkLoading: false,
    blockTestDistance: 10,
    texturePath: '',
    playerStart: [0.5, 20, 0.5],
    clearColor: [0.8, 0.9, 1],
});
// Day-night cycle variables
let timeOfDay = 0; // 0-1, represents the time of day (0 = midnight, 0.5 = noon)
const dayDuration = 1800000; // Duration of a full day-night cycle in seconds (30 minutes)
let sunLight, skybox;
// Set up lighting and skybox
function setupDayNightCycle() {
    const scene = noa.rendering.getScene();
    // Create a directional light for the sun
    sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(0, -1, 0), scene);
    sunLight.intensity = 1;
    // Create a skybox
    skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {
        size: 1000.0
    }, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("skybox", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;
}
setupDayNightCycle();
// Game mode variable
let isCreativeMode = false;
// Перлин шум
// Improved Perlin noise implementation
const permutation = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153,
    101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179,
    162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114,
    67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];
// Extend the permutation table
const p = new Array(512);
for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t, a, b) {
    return a + t * (b - a);
}

function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
}

function perlin(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = p[X] + Y,
        AA = p[A] + Z,
        AB = p[A + 1] + Z;
    const B = p[X + 1] + Y,
        BA = p[B] + Z,
        BB = p[B + 1] + Z;
    return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z),
                grad(p[BA], x - 1, y, z)),
            lerp(u, grad(p[AB], x, y - 1, z),
                grad(p[BB], x - 1, y - 1, z))),
        lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1),
                grad(p[BA + 1], x - 1, y, z - 1)),
            lerp(u, grad(p[AB + 1], x, y - 1, z - 1),
                grad(p[BB + 1], x - 1, y - 1, z - 1))));
}

// Block colors
const brownish = [0.45, 0.36, 0.22];
const greenish = [0.1, 0.8, 0.2];
const darkGreenish = [0.05, 0.5, 0.05];
const blueish = [0.1, 0.8, 0.2];
const redish = [0.2, 0.2, 0.05];
const sandish = [0.9, 0.8, 0.6];
const woodish = [0.6, 0.4, 0.2];
const leafish = [0.2, 0.8, 0.2];
const blueLeafish = [0.05, 0.5, 0.05];
const redLeafish = [0.05, 0.4, 0.05];

let selectedColorID = 0;

const dirtMaterial = noa.registry.registerMaterial('dirt', {
    color: brownish
});
const grassMaterial = noa.registry.registerMaterial('grass', {
    color: greenish
});
const darkGrassMaterial = noa.registry.registerMaterial('darkGrass', {
    color: darkGreenish
});
const blueMaterial = noa.registry.registerMaterial('blue', {
    color: blueish
});
const redMaterial = noa.registry.registerMaterial('red', {
    color: redish
});
const sandMaterial = noa.registry.registerMaterial('sand', {
    color: sandish
});
const woodMaterial = noa.registry.registerMaterial('wood', {
    color: woodish
});
const leafMaterial = noa.registry.registerMaterial('leaf', {
    color: leafish
});
const blueLeafMaterial = noa.registry.registerMaterial('blueLeaf', {
    color: blueLeafish
});
const redLeafMaterial = noa.registry.registerMaterial('redLeaf', {
    color: redLeafish
});

const dirtID = noa.registry.registerBlock(1, {
    material: 'dirt'
});
const grassID = noa.registry.registerBlock(2, {
    material: 'grass'
});
const darkGrassID = noa.registry.registerBlock(3, {
    material: 'darkGrass'
});
const blueGrassID = noa.registry.registerBlock(4, {
    material: 'blue'
});
const redGrassID = noa.registry.registerBlock(5, {
    material: 'red'
});
const sandID = noa.registry.registerBlock(6, {
    material: 'sand'
});
const woodID = noa.registry.registerBlock(7, {
    material: 'wood'
});
const leafID = noa.registry.registerBlock(8, {
    material: 'leaf'
});
const blueLeafID = noa.registry.registerBlock(9, {
    material: 'blueLeaf'
});
const redLeafID = noa.registry.registerBlock(10, {
    material: 'redLeaf'
});
// Add TNT block
const tntMaterial = noa.registry.registerMaterial('tnt', {
    color: [0.9, 0.1, 0.1]
});
const tntID = noa.registry.registerBlock(11, {
    material: 'tnt'
});
//const caveID = noa.registry.registerBlock(11, { material: 'dirt' }); // Блок для пещер
//const airID = 0; // Воздух для генерации пещер

const colors = [dirtID, grassID, darkGrassID, blueGrassID, redGrassID, sandID];

function getVoxelID(x, y, z) {
    const height = Math.floor(25 * (perlin(x / 50, y / 50, z / 50) * 0.5 + 0.5));
    const biomeNoise = perlin(x / 1000, y / 1000, z / 1000); // Changed from 200 to 1000
    if (y < height - 1) {
        return dirtID;
    } else if (y === height - 1 || y === height) {
        // Use the same logic for both the top layer and one below
        if (biomeNoise < -0.2) {
            return darkGrassID;
        } else if (biomeNoise < -0.1) {
            return blueGrassID;
        } else if (biomeNoise > 0.3) {
            return sandID;
        } else if (biomeNoise > 0.1) {
            return redGrassID;
        } else {
            return grassID;
        }
    } else {
        return 0; // Air above the surface
    }
}

noa.world.on('worldDataNeeded', function(id, data, x, y, z) {
    for (let i = 0; i < data.shape[0]; i++) {
        for (let j = 0; j < data.shape[1]; j++) {
            for (let k = 0; k < data.shape[2]; k++) {
                const voxelID = getVoxelID(x + i, y + j, z + k);
                data.set(i, j, k, voxelID);
            }
        }
    }

    // Block data
    for (let i = 0; i < data.shape[0]; i++) {
        for (let j = 0; j < data.shape[1]; j++) {
            for (let k = 0; k < data.shape[2]; k++) {
                const biomeNoise = perlin((x + i) / 1000, (y + j) / 1000, (z + k) / 1000); // Changed from 200 to 1000
                if (data.get(i, j, k) === grassID && Math.random() < 0.01 || (data.get(i, j, k) === blueGrassID && Math.random() < 0.01) || (data.get(i, j, k) === redGrassID && Math.random() < 0.01)) {
                    let treeHeight = Math.floor(Math.random() * 10) + 3;
                    if (biomeNoise > 0.1) {
                        treeHeight = Math.floor(Math.random() * 10) + 8;
                    } else if (biomeNoise < -0.1) {
                        treeHeight = Math.floor(Math.random() * 3) + 3;
                    }
                    let hasPlacedTrunk = false;
                    for (let h = 1; h <= treeHeight; h++) {
                        if (data.get(i, j + h, k) === 0) {
                            data.set(i, j + h, k, woodID);
                            hasPlacedTrunk = true;
                        } else {
                            break;
                        }
                    }
                    if (hasPlacedTrunk) {
                        for (let dx = -2; dx <= 2; dx++) {
                            for (let dy = -2; dy <= 2; dy++) {
                                for (let dz = -2; dz <= 2; dz++) {
                                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                                    if (distance < 2.5 + Math.random() * 0.5 && data.get(i + dx, j + treeHeight + 1 + dy, k + dz) === 0) {
                                        if (biomeNoise < -0.2) {
                                            // Biome noise function
                                        } else if (biomeNoise < -0.1) {
                                            data.set(i + dx, j + treeHeight + 1 + dy, k + dz, blueLeafID);
                                        } else if (biomeNoise > 0.1) {
                                            data.set(i + dx, j + treeHeight + 1 + dy, k + dz, redLeafID);
                                            if (distance < 4 + Math.random() * 0.5 && data.get(i + dx, j + treeHeight + 2 + dy, k + dz) === 0) {
                                                data.set(i + dx, j + treeHeight + 2 + dy, k + dz, redLeafID);
                                            }
                                        } else {
                                            data.set(i + dx, j + treeHeight + 1 + dy, k + dz, leafID);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (data.get(i, j, k) === darkGrassID && Math.random() < 0.01) {
                    const treeHeight = Math.floor(Math.random() * 3) + 3;
                    let hasPlacedTrunk = false;
                    for (let h = 1; h <= treeHeight; h++) {
                        if (data.get(i, j + h, k) === 0) {
                            data.set(i, j + h, k, woodID);
                            hasPlacedTrunk = true;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
    }
    noa.world.setChunkData(id, data);
});

// Player spawn area
function getPlayerSpawnHeight(x, z) {
    let y = 0;
    while (getVoxelID(x, y, z) === dirtID && y < 100) {
        y++;
    }
    return y;
}

const spawnX = 0;
const spawnZ = 0;
const spawnY = getPlayerSpawnHeight(spawnX, spawnZ);

const player = noa.playerEntity;
const dat = noa.entities.getPositionData(player);
const w = dat.width;
const h = dat.height;

const scene = noa.rendering.getScene();
scene.clearColor = new BABYLON.Color3(0.7, 0.7, 1); // Установка цвета неба

const mesh = BABYLON.MeshBuilder.CreateBox('player-mesh', {}, scene);
mesh.scaling.x = w;
mesh.scaling.z = w;
mesh.scaling.y = h;
mesh.material = noa.rendering.makeStandardMaterial("default");

noa.entities.addComponent(player, noa.entities.names.mesh, {
    mesh: mesh,
    offset: [0, h / 2, 0],
});
// Player inventory
const playerInventory = {
    items: new Array(9).fill(null),
    selectedSlot: 0,
    addItem: function(blockID) {
        if (isCreativeMode) {
            // In creative mode, always add the item with infinite count
            this.items[this.selectedSlot] = {
                id: blockID,
                count: Infinity
            };
            return true;
        }
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i] === null) {
                this.items[i] = {
                    id: blockID,
                    count: 1
                };
                return true;
            } else if (this.items[i].id === blockID && this.items[i].count < 100) {
                this.items[i].count++;
                return true;
            }
        }
        return false;
    },
    removeItem: function(index) {
        if (isCreativeMode) {
            // In creative mode, don't actually remove items
            return this.items[index] ? this.items[index].id : null;
        }
        if (index >= 0 && index < this.items.length && this.items[index] !== null) {
            this.items[index].count--;
            if (this.items[index].count === 0) {
                const blockID = this.items[index].id;
                this.items[index] = null;
                return blockID;
            }
            return this.items[index].id;
        }
        return null;
    },
    fillCreativeInventory: function() {
        this.items = [{
            id: dirtID,
            count: Infinity
        }, {
            id: grassID,
            count: Infinity
        }, {
            id: darkGrassID,
            count: Infinity
        }, {
            id: blueGrassID,
            count: Infinity
        }, {
            id: redGrassID,
            count: Infinity
        }, {
            id: sandID,
            count: Infinity
        }, {
            id: woodID,
            count: Infinity
        }, {
            id: leafID,
            count: Infinity
        }];
    }
};
// TNT removed from player's inventory

noa.inputs.down.on('fire', function() {
    if (noa.targetedBlock) {
        const pos = noa.targetedBlock.position;
        const blockID = noa.getBlock(pos[0], pos[1], pos[2]);
        if (blockID !== 0) {
            const added = playerInventory.addItem(blockID);
            if (added) {
                noa.setBlock(0, pos[0], pos[1], pos[2]);
                console.log('Block added to inventory:', blockID);
            } else {
                console.log('Inventory full!');
            }
        }
    }
});

noa.inputs.down.on('alt-fire', function() {
    if (noa.targetedBlock) {
        const pos = noa.targetedBlock.adjacent;
        const selectedItem = playerInventory.items[playerInventory.selectedSlot];
        if (selectedItem !== null) {
            const blockID = isCreativeMode ? selectedItem.id : playerInventory.removeItem(playerInventory.selectedSlot);
            if (blockID !== null) {
                noa.setBlock(blockID, pos[0], pos[1], pos[2]);
                console.log('Block placed from inventory:', blockID);
                updateInventoryDisplay();
            }
        } else {
            console.log('No blocks in selected slot!');
        }
    }
});

// Binding keys 1-9 to select inventory slots
for (let i = 1; i <= 9; i++) {
    noa.inputs.bind(i.toString(), 'Digit' + i);
    noa.inputs.down.on(i.toString(), function() {
        playerInventory.selectedSlot = i - 1;
        updateInventoryDisplay();
    });
}

noa.on('tick', function(dt) {
    const scroll = noa.inputs.pointerState.scrolly;
    if (scroll !== 0) {
        noa.camera.zoomDistance += scroll > 0 ? 1 : -1;
        if (noa.camera.zoomDistance < 0) noa.camera.zoomDistance = 0;
        if (noa.camera.zoomDistance > 10) noa.camera.zoomDistance = 10;
    }
});
// Create inventory display
const inventoryContainer = document.createElement('div');
inventoryContainer.style.position = 'absolute';
inventoryContainer.style.bottom = '10px';
inventoryContainer.style.left = '50%';
inventoryContainer.style.transform = 'translateX(-50%)';
inventoryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
inventoryContainer.style.padding = '10px';
inventoryContainer.style.borderRadius = '5px';
inventoryContainer.style.display = 'flex';
inventoryContainer.style.flexDirection = 'column';
inventoryContainer.style.alignItems = 'center';
inventoryContainer.style.gap = '5px';
document.body.appendChild(inventoryContainer);
// Create block counter
const blockCounter = document.createElement('div');
blockCounter.style.color = 'white';
blockCounter.style.marginBottom = '5px';
inventoryContainer.appendChild(blockCounter);
// Create slot container
const slotContainer = document.createElement('div');
slotContainer.style.display = 'flex';
slotContainer.style.gap = '5px';
inventoryContainer.appendChild(slotContainer);
// Create inventory slots
for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.style.width = '40px';
    slot.style.height = '40px';
    slot.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    slot.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    slot.style.borderRadius = '5px';
    slot.style.display = 'flex';
    slot.style.justifyContent = 'center';
    slot.style.alignItems = 'center';
    slotContainer.appendChild(slot);
}
// Update inventory display
function updateInventoryDisplay() {
    const slots = slotContainer.children;
    for (let i = 0; i < 9; i++) {
        const slot = slots[i];
        const item = playerInventory.items[i];
        // Highlight selected slot
        if (i === playerInventory.selectedSlot) {
            slot.style.border = '2px solid yellow';
        } else {
            slot.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        }
        if (item !== null) {
            const blockColor = getBlockColor(item.id);
            const blockName = getBlockName(item.id);
            slot.innerHTML = `
                <div style="width: 30px; height: 30px; background-color: rgb(${blockColor[0]*255}, ${blockColor[1]*255}, ${blockColor[2]*255});">
                    <span style="position: absolute; bottom: 0; right: 2px; color: white; font-size: 10px;">${isCreativeMode ? '∞' : item.count}</span>
                </div>
                <div style="position: absolute; bottom: -20px; left: 0; right: 0; text-align: center; color: white; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${blockName}
                </div>
            `;
            slot.title = blockName; // Add tooltip
        } else {
            slot.innerHTML = '';
            slot.title = ''; // Clear tooltip
        }
    }
    // Update block counter
    const totalBlocks = isCreativeMode ? '∞' : calculateTotalBlocks();
    blockCounter.textContent = `Total Blocks: ${totalBlocks}`;

    // Display current game mode
    const gameModeDisplay = document.getElementById('gameModeDisplay') || createGameModeDisplay();
    gameModeDisplay.textContent = isCreativeMode ? 'Creative Mode' : 'Survival Mode';
}

function createGameModeDisplay() {
    const display = document.createElement('div');
    display.id = 'gameModeDisplay';
    display.style.position = 'absolute';
    display.style.top = '10px';
    display.style.right = '10px';
    display.style.color = 'white';
    display.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    display.style.padding = '5px';
    display.style.borderRadius = '5px';
    document.body.appendChild(display);
    return display;
}

function getBlockColor(blockID) {
    switch (blockID) {
        case dirtID:
            return brownish;
        case grassID:
            return greenish;
        case darkGrassID:
            return darkGreenish;
        case blueGrassID:
            return blueish;
        case redGrassID:
            return redish;
        case sandID:
            return sandish;
        case woodID:
            return woodish;
        case leafID:
            return leafish;
        case blueLeafID:
            return blueLeafish;
        case redLeafID:
            return redLeafish;
        default:
            return [0.5, 0.5, 0.5]; // Default gray for unknown blocks
    }
}
// Function to get block name
function getBlockName(blockID) {
    switch (blockID) {
        case dirtID:
            return "Dirt";
        case grassID:
            return "Grass";
        case darkGrassID:
            return "Dark Grass";
        case blueGrassID:
            return "Blue Grass";
        case redGrassID:
            return "Red Grass";
        case sandID:
            return "Sand";
        case woodID:
            return "Wood";
        case leafID:
            return "Leaves";
        case blueLeafID:
            return "Blue Leaves";
        case redLeafID:
            return "Red Leaves";
        default:
            return "Unknown Block";
    }
}
// Function to calculate total blocks
function calculateTotalBlocks() {
    return playerInventory.items.reduce((total, item) => {
        return total + (item ? item.count : 0);
    }, 0);
}
// Call this function whenever the inventory changes
updateInventoryDisplay();
// Modify the tick function to update the inventory display
noa.on('tick', function(dt) {
    const scroll = noa.inputs.pointerState.scrolly;
    if (scroll !== 0) {
        noa.camera.zoomDistance += scroll > 0 ? 1 : -1;
        if (noa.camera.zoomDistance < 0) noa.camera.zoomDistance = 0;
        if (noa.camera.zoomDistance > 10) noa.camera.zoomDistance = 10;
    }
    // Update inventory display
    updateInventoryDisplay();
    // Handle creative inventory UI
    if (isCreativeMode && creativeInventoryUI && creativeInventoryUI.style.display !== 'none') {
        noa.inputs.disabled = true;
    } else {
        noa.inputs.disabled = false;
    }
    // Update day-night cycle
    updateDayNightCycle(dt);
    // Display current time
    updateTimeDisplay();
});
// TNT explosion function
function explodeTNT(pos) {
    const explosionRadius = 3;
    for (let x = -explosionRadius; x <= explosionRadius; x++) {
        for (let y = -explosionRadius; y <= explosionRadius; y++) {
            for (let z = -explosionRadius; z <= explosionRadius; z++) {
                const distance = Math.sqrt(x * x + y * y + z * z);
                if (distance <= explosionRadius) {
                    const blockX = Math.floor(pos[0] + x);
                    const blockY = Math.floor(pos[1] + y);
                    const blockZ = Math.floor(pos[2] + z);

                    // Check if the block is not air (0)
                    if (noa.getBlock(blockX, blockY, blockZ) !== 0) {
                        noa.setBlock(0, blockX, blockY, blockZ);
                    }
                }
            }
        }
    }

    // Create a visual explosion effect
    createExplosionEffect(pos);

    console.log('TNT exploded at', pos);
}

function createExplosionEffect(pos) {
    const scene = noa.rendering.getScene();
    const particleSystem = new BABYLON.ParticleSystem("explosion", 2000, scene);

    particleSystem.particleTexture = new BABYLON.Texture("explosion_particle-8YHf", scene);
    particleSystem.emitter = new BABYLON.Vector3(pos[0], pos[1], pos[2]);

    particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
    particleSystem.color2 = new BABYLON.Color4(1, 0, 0, 1.0);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);

    particleSystem.minSize = 0.3;
    particleSystem.maxSize = 1.5;

    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 1.5;

    particleSystem.emitRate = 2000;

    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);

    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;
    particleSystem.updateSpeed = 0.005;

    particleSystem.start();

    setTimeout(() => {
        particleSystem.stop();
    }, 1000);
}
// Function to toggle creative mode
function toggleCreativeMode() {
    isCreativeMode = !isCreativeMode;
    if (isCreativeMode) {
        playerInventory.fillCreativeInventory();
        console.log("Creative mode enabled");
    } else {
        playerInventory.items = new Array(9).fill(null);
        console.log("Survival mode enabled");
        if (creativeInventoryUI) {
            creativeInventoryUI.style.display = 'none';
        }
    }
    updateInventoryDisplay();
}
// Bind 'C' key to toggle creative mode
noa.inputs.bind('toggleCreative', 'KeyC');
noa.inputs.down.on('toggleCreative', toggleCreativeMode);
// Create Creative Inventory UI
let creativeInventoryUI = null;

function createCreativeInventoryUI() {
    if (creativeInventoryUI) {
        creativeInventoryUI.style.display = 'flex';
        return;
    }
    creativeInventoryUI = document.createElement('div');
    creativeInventoryUI.style.position = 'absolute';
    creativeInventoryUI.style.top = '50%';
    creativeInventoryUI.style.left = '50%';
    creativeInventoryUI.style.transform = 'translate(-50%, -50%)';
    creativeInventoryUI.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    creativeInventoryUI.style.padding = '20px';
    creativeInventoryUI.style.borderRadius = '10px';
    creativeInventoryUI.style.display = 'flex';
    creativeInventoryUI.style.flexWrap = 'wrap';
    creativeInventoryUI.style.gap = '10px';
    creativeInventoryUI.style.maxWidth = '80%';
    creativeInventoryUI.style.maxHeight = '80%';
    creativeInventoryUI.style.overflowY = 'auto';
    const allBlocks = [dirtID, grassID, darkGrassID, blueGrassID, redGrassID, sandID, woodID, leafID, blueLeafID, redLeafID];
    allBlocks.forEach(blockID => {
        const blockElement = document.createElement('div');
        blockElement.style.width = '50px';
        blockElement.style.height = '50px';
        blockElement.style.backgroundColor = `rgb(${getBlockColor(blockID).map(c => c * 255).join(',')})`;
        blockElement.style.border = '2px solid white';
        blockElement.style.borderRadius = '5px';
        blockElement.style.cursor = 'pointer';
        blockElement.style.position = 'relative';
        blockElement.onclick = () => {
            playerInventory.addItem(blockID);
            updateInventoryDisplay();
        };
        const blockName = getBlockName(blockID);
        blockElement.title = blockName; // Add tooltip
        const nameLabel = document.createElement('div');
        nameLabel.textContent = blockName;
        nameLabel.style.position = 'absolute';
        nameLabel.style.bottom = '-20px';
        nameLabel.style.left = '0';
        nameLabel.style.right = '0';
        nameLabel.style.textAlign = 'center';
        nameLabel.style.color = 'white';
        nameLabel.style.fontSize = '10px';
        nameLabel.style.whiteSpace = 'nowrap';
        nameLabel.style.overflow = 'hidden';
        nameLabel.style.textOverflow = 'ellipsis';
        blockElement.appendChild(nameLabel);
        creativeInventoryUI.appendChild(blockElement);
    });
    document.body.appendChild(creativeInventoryUI);
}

function toggleCreativeInventory() {
    if (!isCreativeMode) return;
    if (creativeInventoryUI && creativeInventoryUI.style.display !== 'none') {
        creativeInventoryUI.style.display = 'none';
        noa.container.element.requestPointerLock();
    } else {
        createCreativeInventoryUI();
        document.exitPointerLock();
    }
}
// Bind 'Alt' key to toggle creative inventory
noa.inputs.bind('openCreativeInventory', 'AltLeft');
noa.inputs.down.on('openCreativeInventory', toggleCreativeInventory);
// Create time display
const timeDisplay = document.createElement('div');
timeDisplay.style.position = 'absolute';
timeDisplay.style.top = '10px';
timeDisplay.style.left = '10px';
timeDisplay.style.color = 'white';
timeDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
timeDisplay.style.padding = '5px';
timeDisplay.style.borderRadius = '5px';
document.body.appendChild(timeDisplay);

function updateTimeDisplay() {
    const hours = Math.floor(timeOfDay * 24);
    const minutes = Math.floor((timeOfDay * 24 * 60) % 60);
    timeDisplay.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
// Update lighting based on time of day
function updateDayNightCycle(dt) {
    timeOfDay += dt / dayDuration;
    if (timeOfDay >= 1) timeOfDay -= 1;
    const sunAngle = Math.PI * (timeOfDay * 2 - 0.5);
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    // Update sun position
    sunLight.direction = new BABYLON.Vector3(sunX, sunY, 0);
    // Update light intensity and color
    let intensity = Math.max(0, Math.min(1, sunY * 2 + 0.2));
    sunLight.intensity = intensity;
    // Update skybox color
    const skyColor = new BABYLON.Color3(
        0.3 + 0.7 * intensity,
        0.6 + 0.4 * intensity,
        1
    );
    noa.rendering.getScene().clearColor = skyColor;
    // Update ambient light
    noa.rendering.getScene().ambientColor = new BABYLON.Color3(intensity, intensity, intensity);
    // Rotate skybox
    skybox.rotation.y = sunAngle;
}
