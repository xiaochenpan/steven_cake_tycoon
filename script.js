// ========================================================
        // CODEPEN SETUP - JS PANEL
        // Copy everything below this line and paste it into the JS panel.
        // ========================================================
        const jsWarning = document.getElementById('js-warning');
        if (jsWarning) jsWarning.remove();

        let playerColorIndex = 0;
        function selectColor(btnElement, index) {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('ring-selected'));
            btnElement.classList.add('ring-selected');
            playerColorIndex = index;
            document.getElementById('start-btn').classList.remove('hidden');
        }

        function startGame() {
            document.getElementById('loading-screen').remove();
            init();
        }

        // Global Player State
        let scene, camera, renderer, player, clock;
        let money = 25; 
        
        // Manual Baking State
        let manualBaking = {
            batter: 0,
            cakes: 0,
            recipeTier: 1
        };

        let cakes = [], buttons = [];
        let lastDrop = 0;
        const DROP_INTERVAL = 1.5;
        const keys = {};
        let canJump = false;
        
        const NUM_FACTORIES = 6;
        let factories = [];
        for(let i=0; i<NUM_FACTORIES; i++) {
            factories.push({
                unlocked: i === 0,
                priceMult: Math.pow(2.5, i),
                dropperCount: 0,
                upgradeCost: 100 * Math.pow(2.5, i),
                cakeValue: 5 * Math.pow(2.5, i),
                activeDroppers: [],
                flags: {
                    floor2: false, floor3: false,
                    launchPad: false, miniStatue: false,
                    skyDropper: false, moonDropper: false, completed: false,
                    hedges: false, floor2Belt: false, floor2Dropper: false
                },
                parts: {}
            });
        }
        
        let yaw = -Math.PI / 2; 
        let pitch = 0;
        const mouseSensitivity = 0.004;

        // UI Updater
        function updateInventoryUI() {
            document.getElementById('batter-display').innerText = manualBaking.batter;
            document.getElementById('baked-cakes-display').innerText = manualBaking.cakes;
            document.getElementById('money-display').innerText = "$" + money.toLocaleString();
        }

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87CEEB); 
            scene.fog = new THREE.Fog(0x4CAF50, 150, 500);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);

            scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
            const sun = new THREE.DirectionalLight(0xffffff, 0.9);
            sun.position.set(50, 80, 20);
            sun.castShadow = true;
            scene.add(sun);

            const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ color: 0x388E3C }));
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            createWorldLayout();

            player = new THREE.Group();
            player.position.set(4, 0, 4); 
            scene.add(player);

            setupButtons(0); 
            updateInventoryUI(); // Initial UI draw

            const canvas = renderer.domElement;
            canvas.addEventListener('click', () => { canvas.requestPointerLock(); });

            document.addEventListener('mousemove', (e) => {
                if (document.pointerLockElement === canvas) {
                    yaw -= e.movementX * (mouseSensitivity / 1.5);
                    pitch = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, pitch - e.movementY * (mouseSensitivity / 1.5)));
                }
            });

            clock = new THREE.Clock();
            animate();
        }

        function getWorldPos(localX, y, localZ, angle) {
            return new THREE.Vector3(
                localX * Math.cos(angle) - localZ * Math.sin(angle),
                y,
                localX * Math.sin(angle) + localZ * Math.cos(angle)
            );
        }

        function createWorldLayout() {
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x333333 }));
            hub.position.y = 0.1; scene.add(hub);

            const pathColors = [ 0xff1493, 0x00ffff, 0x2e8b57, 0xcd853f, 0xffd700, 0xffe4c4 ];
            let temp = pathColors[0]; pathColors[0] = pathColors[playerColorIndex]; pathColors[playerColorIndex] = temp;
            
            const tycoonDist = 85; 

            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const pathGroup = new THREE.Group();
                const path = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 80), new THREE.MeshStandardMaterial({ color: pathColors[i] }));
                path.position.y = 0.1; pathGroup.add(path);
                pathGroup.position.set(Math.cos(angle) * 45, 0, Math.sin(angle) * 45);
                pathGroup.rotation.y = angle - Math.PI/2; 
                scene.add(pathGroup);

                createTycoonShell(i, Math.cos(angle) * tycoonDist, Math.sin(angle) * tycoonDist, angle + Math.PI/2, pathColors[i]);
                createMoonBase(i, angle);
            }
        }

        function createTycoonShell(fi, x, z, rotation, teamColor) {
            const tycoon = new THREE.Group();
            const base = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 30), new THREE.MeshStandardMaterial({ color: teamColor }));
            base.position.y = 1; tycoon.add(base);

            const floorMain = new THREE.Mesh(new THREE.BoxGeometry(28, 2.2, 28), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            floorMain.position.set(0, 1, 0); tycoon.add(floorMain);

            const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
            const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 24, 28), glassMat); wallLeft.position.set(-14, 13, 0); tycoon.add(wallLeft);
            const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 24, 28), glassMat); wallRight.position.set(14, 13, 0); tycoon.add(wallRight);
            const wallFront1 = new THREE.Mesh(new THREE.BoxGeometry(10, 24, 0.5), glassMat); wallFront1.position.set(-9, 13, -14); tycoon.add(wallFront1);
            const wallFront2 = new THREE.Mesh(new THREE.BoxGeometry(10, 24, 0.5), glassMat); wallFront2.position.set(9, 13, -14); tycoon.add(wallFront2);
            const wallBack = new THREE.Mesh(new THREE.BoxGeometry(28, 24, 0.5), glassMat); wallBack.position.set(0, 13, 14); tycoon.add(wallBack);

            // Hedge System
            const hedgeGroup = new THREE.Group();
            const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x1b4332 });
            const hedgeGeomSide = new THREE.BoxGeometry(1, 3.5, 32);
            const hedgeGeomFront = new THREE.BoxGeometry(11, 3.5, 1);

            const hLeft = new THREE.Mesh(hedgeGeomSide, hedgeMat); hLeft.position.set(-17, 1.75, 0); hedgeGroup.add(hLeft);
            const hRight = new THREE.Mesh(hedgeGeomSide, hedgeMat); hRight.position.set(17, 1.75, 0); hedgeGroup.add(hRight);
            const hBack = new THREE.Mesh(new THREE.BoxGeometry(34, 3.5, 1), hedgeMat); hBack.position.set(0, 1.75, 16); hedgeGroup.add(hBack);
            const hFrontL = new THREE.Mesh(hedgeGeomFront, hedgeMat); hFrontL.position.set(-12, 1.75, -16); hedgeGroup.add(hFrontL);
            const hFrontR = new THREE.Mesh(hedgeGeomFront, hedgeMat); hFrontR.position.set(12, 1.75, -16); hedgeGroup.add(hFrontR);
            
            hedgeGroup.visible = false;
            factories[fi].parts.hedges = hedgeGroup;
            tycoon.add(hedgeGroup);

            // Upper Floors
            const upperFloorsAndStairs = new THREE.Group();
            for(let i=0; i<2; i++) {
                const f = new THREE.Mesh(new THREE.BoxGeometry(27.5, 0.5, 27.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
                f.position.y = 10 + (i * 8); upperFloorsAndStairs.add(f);
            }
            const stepMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f });
            for(let i=0; i<15; i++) {
                const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 1.5), stepMat);
                step.position.set(10, 2.5 + (i * 0.5), -10 + (i * 0.9));
                upperFloorsAndStairs.add(step);
            }
            upperFloorsAndStairs.visible = false;
            factories[fi].parts.upperFloors = upperFloorsAndStairs;
            tycoon.add(upperFloorsAndStairs);

            // 2nd Floor Belt & Bin
            const floor2BeltGroup = new THREE.Group();
            const belt2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            belt2.position.set(8, 10.45, 0); 
            const bin2 = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
            bin2.position.set(8, 10.2, 5);
            floor2BeltGroup.add(belt2, bin2);
            floor2BeltGroup.visible = false;
            factories[fi].parts.floor2Belt = floor2BeltGroup;
            tycoon.add(floor2BeltGroup);

            // Manual Baking Station Models (Attached to Floor 2)
            const bakingStation = new THREE.Group();
            const desk = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 3), new THREE.MeshStandardMaterial({color: 0x8b4513}));
            desk.position.set(0, 10.75, 8); 
            const oven = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({color: 0x333333}));
            oven.position.set(-3, 11.5, 8);
            const ovenGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshBasicMaterial({color: 0xff4500}));
            ovenGlow.position.set(-3, 11.5, 9.01);
            
            // NPC Cake Seller
            const sellerStand = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.5, 16), new THREE.MeshStandardMaterial({color: 0xffd700}));
            sellerStand.position.set(5, 10.75, -8);
            const sellerNPC = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshStandardMaterial({color: 0xffdbac}));
            sellerNPC.position.set(5, 12.5, -8);
            
            bakingStation.add(desk, oven, ovenGlow, sellerStand, sellerNPC);
            bakingStation.visible = false;
            factories[fi].parts.bakingStation = bakingStation;
            tycoon.add(bakingStation);

            const floor3Stairs = new THREE.Group();
            for(let i=0; i<16; i++) {
                const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 1.5), stepMat);
                step.position.set(-10, 10.5 + (i * 0.5), -10 + (i * 0.9));
                floor3Stairs.add(step);
            }
            floor3Stairs.visible = false;
            factories[fi].parts.floor3Stairs = floor3Stairs;
            tycoon.add(floor3Stairs);

            const launchPad = new THREE.Group();
            const bridgeFloor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 28), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            bridgeFloor.position.set(0, -0.25, -28); 
            const padBase = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 }));
            padBase.position.set(0, 0, -42);
            launchPad.add(bridgeFloor, padBase);
            launchPad.position.set(0, 18.25, 0); launchPad.visible = false;
            factories[fi].parts.launchPad = launchPad;
            tycoon.add(launchPad);

            const belt = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            belt.position.set(0, 2.45, 8); tycoon.add(belt);
            const bin = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
            bin.position.set(-13, 2, 8); tycoon.add(bin); 

            tycoon.position.set(x, 0, z); tycoon.rotation.y = rotation;
            scene.add(tycoon);
        }

        function createMoonBase(fi, angle) {
            const moonGroup = new THREE.Group();
            const moonGround = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x555555 }));
            moonGround.rotation.x = -Math.PI / 2; moonGroup.add(moonGround);
            const dome = new THREE.Mesh(new THREE.SphereGeometry(38, 32, 16, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
            moonGroup.add(dome);
            const returnPad = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
            returnPad.position.set(0, 0.25, 15); moonGroup.add(returnPad);
            const belt = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 33), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            belt.position.set(8, 0.15, -3.5); moonGroup.add(belt);
            const bin = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            bin.position.set(8, 1.5, 13); moonGroup.add(bin);
            moonGroup.position.set(85 * Math.cos(angle), 500, 85 * Math.sin(angle)); 
            moonGroup.rotation.y = angle; scene.add(moonGroup);
        }

        function makeTextSprite(message) {
            const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0,0,512,128);
            ctx.font = "Bold 36px Arial"; ctx.fillStyle = "white"; ctx.textAlign = "center";
            ctx.fillText(message, 256, 75);
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
            sprite.scale.set(6, 1.5, 1); return sprite;
        }

        function makeBtn(localX, localY, localZ, col, label, act, fi, reusable = false) {
            const angle = (fi / 6) * Math.PI * 2;
            const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16), new THREE.MeshStandardMaterial({ color: col }));
            btn.position.copy(getWorldPos(localX, localY, localZ, angle));
            const sprite = makeTextSprite(label); sprite.position.y = 1.5; btn.add(sprite);
            scene.add(btn);
            buttons.push({ mesh: btn, action: act, fi: fi, reusable: reusable, cooldown: 0 });
        }

        const dropperPrices = [25, 150, 500];

        function check100Percent(fi) {
            const f = factories[fi];
            if (!f.flags.completed && f.dropperCount === 3 && f.flags.floor2 && f.flags.floor3 && f.flags.launchPad && f.flags.skyDropper && f.flags.moonDropper && f.flags.floor2Belt && f.flags.floor2Dropper) {
                f.flags.completed = true;
                if (fi < 5) spawnTakeoverButton(fi + 1);
            }
        }

        function spawnTakeoverButton(nextFi) {
            const angle = (nextFi / 6) * Math.PI * 2;
            const btn = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
            btn.position.set(Math.cos(angle) * 35, 0.15, Math.sin(angle) * 35);
            const cost = 50000 * factories[nextFi].priceMult;
            const sprite = makeTextSprite(`Unlock Factory ${nextFi+1}\n$${cost.toLocaleString()}`);
            sprite.position.y = 2; btn.add(sprite);
            scene.add(btn);
            buttons.push({ mesh: btn, action: () => {
                if (money >= cost) {
                    money -= cost; factories[nextFi].unlocked = true;
                    setupButtons(nextFi);
                    document.getElementById('factories-display').innerText = factories.filter(f => f.unlocked).length;
                    updateInventoryUI();
                    return true; 
                } return false;
            }, reusable: false });
        }

        function setupButtons(fi) {
            const f = factories[fi];
            spawnDropperButton(fi);
            spawnUpgradeButton(fi);
            
            const f2Cost = 2000 * f.priceMult;
            makeBtn(75, 2.2, -10, 0xffa500, `Second Story Bakery $${f2Cost.toLocaleString()}`, () => {
                if (money >= f2Cost && !f.flags.floor2) { 
                    money -= f2Cost; f.flags.floor2 = true; 
                    f.parts.upperFloors.visible = true; 
                    f.parts.bakingStation.visible = true; 
                    spawnFloor3Button(fi); 
                    spawnBakingButtons(fi); 
                    spawnFloor2BeltButton(fi);
                    check100Percent(fi); 
                    updateInventoryUI();
                    return true; 
                } return false;
            }, fi);

            const hedgeCost = 2500 * f.priceMult;
            makeBtn(65, 0.15, -14, 0x1b4332, `Security Hedges $${hedgeCost.toLocaleString()}`, () => {
                if (money >= hedgeCost && !f.flags.hedges) {
                    money -= hedgeCost; f.flags.hedges = true; f.parts.hedges.visible = true; updateInventoryUI(); return true;
                } return false;
            }, fi);
        }

        function spawnFloor2BeltButton(fi) {
            const f = factories[fi];
            const cost = 3000 * f.priceMult;
            makeBtn(85, 10.35, 2, 0x555555, `2nd Floor Conveyor\n$${cost.toLocaleString()}`, () => {
                if (money >= cost && !f.flags.floor2Belt) {
                    money -= cost; f.flags.floor2Belt = true;
                    f.parts.floor2Belt.visible = true;
                    spawnFloor2DropperButton(fi);
                    check100Percent(fi); updateInventoryUI(); return true;
                } return false;
            }, fi);
        }

        function spawnFloor2DropperButton(fi) {
            const f = factories[fi];
            const cost = 4000 * f.priceMult;
            makeBtn(92, 10.35, -2, 0xff69b4, `Pink Cake Dropper\n$${cost.toLocaleString()}`, () => {
                if (money >= cost && !f.flags.floor2Dropper) {
                    money -= cost; f.flags.floor2Dropper = true;
                    spawnFloor2Dropper(fi);
                    check100Percent(fi); updateInventoryUI(); return true;
                } return false;
            }, fi);
        }

        function spawnBakingButtons(fi) {
            const f = factories[fi];
            const ingCost = 15 * f.priceMult;

            makeBtn(85, 10.35, 11, 0xaaaaaa, `Buy Ingredients\n$${ingCost}`, () => {
                if (money >= ingCost) {
                    money -= ingCost; manualBaking.batter++; updateInventoryUI(); return true;
                } return false;
            }, fi, true);

            makeBtn(81, 10.35, 11, 0xffa500, `Bake Cake\n(-1 Ingredient)`, () => {
                if (manualBaking.batter > 0) {
                    manualBaking.batter--; manualBaking.cakes++; updateInventoryUI(); return true;
                } return false;
            }, fi, true);

            makeBtn(90, 10.35, -5, 0x00ff00, `Cake Seller\n(Sell Backpack)`, () => {
                if (manualBaking.cakes > 0) {
                    const earnings = manualBaking.cakes * (50 + (manualBaking.recipeTier * 50)) * f.priceMult;
                    money += earnings; manualBaking.cakes = 0; updateInventoryUI(); return true;
                } return false;
            }, fi, true);
            
            spawnRecipeUpgrade(fi);
        }

        function spawnRecipeUpgrade(fi) {
            const f = factories[fi];
            if (!f.recipeTierLocal) f.recipeTierLocal = 1;
            if (f.recipeTierLocal > 5) return; 

            const cost = 500 * f.priceMult * Math.pow(2.5, f.recipeTierLocal - 1);
            makeBtn(88, 10.35, 11, 0xff00ff, `Upgrade Recipe\n$${cost.toLocaleString()}`, () => {
                if (money >= cost) {
                    money -= cost; 
                    f.recipeTierLocal++; 
                    manualBaking.recipeTier++; 
                    updateInventoryUI();
                    spawnRecipeUpgrade(fi); 
                    return true;
                } return false;
            }, fi, false);
        }

        function spawnFloor3Button(fi) {
            const f = factories[fi];
            const f3Cost = 5000 * f.priceMult;
            makeBtn(93, 10.35, -10, 0xff5500, `Penthouse Patisserie $${f3Cost.toLocaleString()}`, () => {
                if (money >= f3Cost && !f.flags.floor3) { 
                    money -= f3Cost; f.flags.floor3 = true; f.parts.floor3Stairs.visible = true; spawnLaunchPadButton(fi); check100Percent(fi); updateInventoryUI(); return true; 
                } return false;
            }, fi);
        }

        function spawnLaunchPadButton(fi) {
            const f = factories[fi];
            const lpCost = 10000 * f.priceMult;
            makeBtn(75, 18.35, 10, 0x00ffff, `Orbital Elevator $${lpCost.toLocaleString()}`, () => {
                if (money >= lpCost && !f.flags.launchPad) { 
                    money -= lpCost; f.flags.launchPad = true; f.parts.launchPad.visible = true; spawnMoonDropperButton(fi); spawnSkyDropperButton(fi); check100Percent(fi); updateInventoryUI(); return true; 
                } return false;
            }, fi);
        }

        function spawnSkyDropperButton(fi) {
            const f = factories[fi];
            const sdCost = 15000 * f.priceMult;
            makeBtn(55, 18.35, 2, 0x00ffaa, `Cloud Confectioner $${sdCost.toLocaleString()}`, () => {
                if (money >= sdCost && !f.flags.skyDropper) {
                    money -= sdCost; f.flags.skyDropper = true; spawnSkyDropper(fi); check100Percent(fi); updateInventoryUI(); return true;
                } return false;
            }, fi);
        }

        function spawnMoonDropperButton(fi) {
            const f = factories[fi];
            const mdCost = 20000 * f.priceMult;
            makeBtn(97, 500.2, -15, 0xaaaaaa, `Galactic Gateau $${mdCost.toLocaleString()}`, () => {
                if (money >= mdCost && !f.flags.moonDropper) { 
                    money -= mdCost; f.flags.moonDropper = true; spawnMoonDropper(fi); check100Percent(fi); updateInventoryUI(); return true; 
                } return false;
            }, fi);
        }

        function spawnDropperButton(fi) {
            const f = factories[fi];
            if (f.dropperCount < 3) {
                const cost = dropperPrices[f.dropperCount] * f.priceMult;
                const localZ = -10 + (f.dropperCount * 6); 
                const names = ["Batter Dropper", "Frosting Flinger", "Sprinkle Cannon"];
                makeBtn(97, 2.2, localZ, 0x00ff00, `${names[f.dropperCount]} $${cost.toLocaleString()}`, () => {
                    if (money >= cost) { money -= cost; spawnDropper(fi); spawnDropperButton(fi); check100Percent(fi); updateInventoryUI(); return true; } return false;
                }, fi);
            }
        }

        function spawnUpgradeButton(fi) {
            const f = factories[fi];
            makeBtn(97, 2.2, 13, 0x0000ff, `Sugar Rush $${f.upgradeCost.toLocaleString()}`, () => {
                if (money >= f.upgradeCost) { money -= f.upgradeCost; f.cakeValue += (10 * f.priceMult); f.upgradeCost *= 2; spawnUpgradeButton(fi); updateInventoryUI(); return true; } return false;
            }, fi);
        }

        function spawnDropper(fi) {
            const f = factories[fi];
            const angle = (fi / 6) * Math.PI * 2;
            const d = new THREE.Group();
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 1.5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
            const overhang = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 })); overhang.position.set(-2.25, 1.6, 0); 
            d.add(pillar, overhang);
            d.rotation.y = Math.PI + angle;
            const localZ = -10 + (f.dropperCount * 6); 
            d.position.copy(getWorldPos(89.5, 4.1, localZ, angle));
            scene.add(d);
            f.activeDroppers.push({pos: getWorldPos(93, 5.5, localZ, angle), type: 'normal', fi: fi});
            f.dropperCount++;
        }

        function spawnFloor2Dropper(fi) {
            const f = factories[fi];
            const angle = (fi / 6) * Math.PI * 2;
            const d = new THREE.Group();
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 1.5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
            const overhang = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 })); overhang.position.set(-2.25, 1.6, 0); 
            d.add(pillar, overhang);
            d.rotation.y = Math.PI + angle;
            d.position.copy(getWorldPos(89.5, 12.35, -5, angle)); 
            scene.add(d);
            f.activeDroppers.push({pos: getWorldPos(93, 13.75, -5, angle), type: 'floor2', fi: fi});
        }

        function spawnMoonDropper(fi) {
            const angle = (fi / 6) * Math.PI * 2;
            const d = new THREE.Group();
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 2), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
            const overhang = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 2), new THREE.MeshStandardMaterial({ color: 0xcccccc })); overhang.position.set(-2.5, 2, 0);
            d.add(pillar, overhang);
            d.rotation.y = Math.PI + angle;
            d.position.copy(getWorldPos(89.5, 500, -15, angle)); 
            scene.add(d);
            factories[fi].activeDroppers.push({pos: getWorldPos(93, 504, -15, angle), type: 'moon', fi: fi});
        }

        function spawnSkyDropper(fi) {
            const angle = (fi / 6) * Math.PI * 2;
            const d = new THREE.Group();
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 1.5), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
            const overhang = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x999999 })); overhang.position.set(-2.25, 1.6, 0); 
            d.add(pillar, overhang);
            d.rotation.y = (-Math.PI / 2) + angle;
            d.position.copy(getWorldPos(55, 18.25, -3.5, angle)); 
            scene.add(d);
            factories[fi].activeDroppers.push({pos: getWorldPos(55, 19.5, 0, angle), type: 'sky', fi: fi});
        }

        function spawnCake(info) {
            const color = info.type === 'moon' ? 0x00ffff : (info.type === 'sky' ? 0x00ffaa : (info.type === 'floor2' ? 0xff69b4 : 0x3d2b1f));
            const cake = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: color }));
            cake.position.copy(info.pos);
            scene.add(cake);
            const targetY = info.type === 'moon' ? 500.5 : (info.type === 'sky' ? 18.6 : (info.type === 'floor2' ? 10.6 : 3.0)); 
            const val = info.type === 'moon' ? (500 * factories[info.fi].priceMult) : (info.type === 'sky' ? (250 * factories[info.fi].priceMult) : (info.type === 'floor2' ? (75 * factories[info.fi].priceMult) : factories[info.fi].cakeValue));
            cakes.push({ mesh: cake, val: val, targetY: targetY, type: info.type, fi: info.fi });
        }

        // PERFECTED COLLISION MATH
        function checkCollision(pos) {
            if (pos.y > 400) { 
                // Check if player is inside ANY of the 6 moon domes
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const pX = (pos.x * Math.cos(-angle) - pos.z * Math.sin(-angle)) - 85;
                    const pZ = pos.x * Math.sin(-angle) + pos.z * Math.cos(-angle);
                    if (Math.sqrt(Math.pow(pX, 2) + Math.pow(pZ, 2)) <= 37.5) return false; // Inside a dome, allow movement
                }
                return true; // Outside bounds of all moon domes, block movement
            }

            for (let i = 0; i < 6; i++) {
                const f = factories[i];
                const angle = (i / 6) * Math.PI * 2;
                const pX = (pos.x * Math.cos(-angle) - pos.z * Math.sin(-angle)) - 85;
                const pZ = pos.x * Math.sin(-angle) + pos.z * Math.cos(-angle);
                
                if (!f.unlocked) { 
                    if (Math.sqrt(Math.pow(pX, 2) + Math.pow(pZ, 2)) < 15) return true; 
                    continue; 
                }
                
                // Factory Main Walls
                if (pX > -14.5 && pX < 14.5 && pZ > -14.5 && pZ < 14.5) {
                    if (pX < -13.5 && (pZ < -4 || pZ > 4)) return true;
                    if (pX > 13.5) return true;
                    if (pZ < -13.5 && (pX < -4 || pX > 4 || pos.y < 18)) return true;
                    if (pZ > 13.5) return true;
                }

                // Hedge Collision (Fully fixed!)
                if (f.flags.hedges) {
                    if (pX > -17.5 && pX < 17.5 && pZ > -16.5 && pZ < 16.5) {
                        if (pZ > 15.5) return true; // Left Hedge
                        if (pZ < -15.5) return true; // Right Hedge
                        if (pX > 15.5) return true; // Back Hedge
                        if (pX < -15.5 && (pZ < -6.5 || pZ > 6.5)) return true; // Front Hedge with perfectly clear gap!
                    }
                }
            }
            if (pos.x < -495 || pos.x > 495 || pos.z < -495 || pos.z > 495) return true;
            return false;
        }


        let playerVelocityY = 0;

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const time = clock.getElapsedTime();

            if (time - lastDrop > DROP_INTERVAL) {
                factories.forEach(f => { if (f.unlocked) f.activeDroppers.forEach(info => spawnCake(info)); });
                lastDrop = time;
            }

            for (let i = cakes.length - 1; i >= 0; i--) {
                const c = cakes[i]; const angle = (c.fi / 6) * Math.PI * 2;
                if (c.mesh.position.y > c.targetY) {
                    c.mesh.position.y -= 10 * delta; if (c.mesh.position.y < c.targetY) c.mesh.position.y = c.targetY;
                } else {
                    if (c.type === 'sky') { c.mesh.position.x += 4 * delta * Math.cos(angle); c.mesh.position.z += 4 * delta * Math.sin(angle); } 
                    else { c.mesh.position.x += 4 * delta * (-Math.sin(angle)); c.mesh.position.z += 4 * delta * Math.cos(angle); }
                    const lX = c.mesh.position.x * Math.cos(-angle) - c.mesh.position.z * Math.sin(-angle);
                    const lZ = c.mesh.position.x * Math.sin(-angle) + c.mesh.position.z * Math.cos(-angle);
                    
                    if ((c.type === 'sky' && lX >= 59.5) || (c.type === 'floor2' && lZ >= 5) || (c.type !== 'sky' && c.type !== 'floor2' && lZ >= 13)) {
                        scene.remove(c.mesh); cakes.splice(i, 1); money += c.val;
                        updateInventoryUI();
                    }
                }
            }

            const moveSpeed = 14; const dir = new THREE.Vector3();
            if (keys['w']) dir.z -= 1; if (keys['s']) dir.z += 1;
            if (keys['a']) dir.x -= 1; if (keys['d']) dir.x += 1;
            if (dir.length() > 0) {
                dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); dir.normalize().multiplyScalar(moveSpeed * delta);
                const nextPos = player.position.clone().add(dir);
                if (!checkCollision(nextPos)) player.position.copy(nextPos);
                player.rotation.y = yaw;
            }

            let groundHeight = 0; let gravity = 45; let activeFi = -1;
            for(let i=0; i<6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const lX = player.position.x * Math.cos(-angle) - player.position.z * Math.sin(-angle);
                if (lX > 30) { activeFi = i; break; }
            }

            if (player.position.y > 400) {
                gravity = 15; groundHeight = 500;
                if (activeFi !== -1) {
                    const angle = (activeFi / 6) * Math.PI * 2;
                    const lX = player.position.x * Math.cos(-angle) - player.position.z * Math.sin(-angle);
                    const lZ = player.position.x * Math.sin(-angle) + player.position.z * Math.cos(-angle);
                    if (Math.abs(lX - 85) < 4 && Math.abs(lZ - 15) < 4) player.position.copy(getWorldPos(43, 19, 0, angle));
                }
            } else {
                if (activeFi !== -1 && factories[activeFi].unlocked) {
                    const f = factories[activeFi]; const angle = (activeFi / 6) * Math.PI * 2;
                    const lX = player.position.x * Math.cos(-angle) - player.position.z * Math.sin(-angle);
                    const lZ = player.position.x * Math.sin(-angle) + player.position.z * Math.cos(-angle);
                    if (f.flags.launchPad && player.position.y > 17.5 && Math.abs(lX - 43) < 4 && Math.abs(lZ) < 4) player.position.copy(getWorldPos(85, 502, 15, angle));
                    if (lX > 70 && lX <= 99 && lZ > -15 && lZ < 14.5) {
                        groundHeight = 2.1; 
                        if (f.flags.floor2) {
                            if (lZ > -12 && lZ < -8 && lX > 75 && lX < 88) groundHeight = 2.1 + ((lX - 75) / 13) * 7.9;
                            else if (player.position.y > 9.5) groundHeight = 10.25;
                            if (f.flags.floor3 && player.position.y > 9.5) {
                                if (lX > 73 && lX < 77 && lZ > -12 && lZ < 5) groundHeight = 10.25 + ((lZ - (-12)) / 17) * 8;
                                else if (player.position.y > 17.5) groundHeight = 18.25;
                            }
                        }
                    } else if (f.flags.launchPad && lX > 38 && lX <= 70 && lZ > -6 && lZ < 6) groundHeight = 18.25;
                }
            }

            playerVelocityY -= gravity * delta; player.position.y += playerVelocityY * delta;
            if (player.position.y <= groundHeight) { player.position.y = groundHeight; playerVelocityY = 0; canJump = true; }
            if (keys[' '] && canJump) { playerVelocityY = gravity === 15 ? 12 : 18; canJump = false; }

            camera.position.copy(player.position).add(new THREE.Vector3(0, 2.2, 0));
            camera.lookAt(camera.position.clone().add(new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))));

            for (let i = buttons.length - 1; i >= 0; i--) {
                const b = buttons[i];
                if (player.position.distanceTo(b.mesh.position) < 2.5 && Math.abs(player.position.y - b.mesh.position.y) < 2) {
                    if (b.reusable) {
                        if (time > b.cooldown) {
                            if (b.action()) b.cooldown = time + 0.3;
                        }
                    } else {
                        if (b.action()) { scene.remove(b.mesh); buttons.splice(i, 1); }
                    }
                }
            }
            renderer.render(scene, camera);
        }

        window.onkeydown = (e) => { keys[e.key.toLowerCase()] = true; };
        window.onkeyup = (e) => { keys[e.key.toLowerCase()] = false; };
        function toggleFullScreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }