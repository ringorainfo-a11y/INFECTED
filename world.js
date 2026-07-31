// ========================================
// INFECTED
// World Generation v0.2
// ========================================

function createWorld(scene){

    // -------------------
    // Atmosphäre
    // -------------------

    scene.background = new THREE.Color(0x07090c);
    scene.fog = new THREE.Fog(0x0a0d10,40,260);

    // -------------------
    // Licht
    // -------------------

    const ambient = new THREE.AmbientLight(0x8ea3b8,0.35);
    scene.add(ambient);

    const moon = new THREE.DirectionalLight(0xc9dcff,1.3);

    moon.position.set(120,180,80);

    moon.castShadow=true;

    moon.shadow.mapSize.width=2048;
    moon.shadow.mapSize.height=2048;

    scene.add(moon);

    // -------------------
    // Boden
    // -------------------

    const ground = new THREE.Mesh(

        new THREE.PlaneGeometry(1200,1200,100,100),

        new THREE.MeshStandardMaterial({

            color:0x29452b,
            roughness:1

        })

    );

    ground.rotation.x=-Math.PI/2;
    ground.receiveShadow=true;

    scene.add(ground);

    createTrees(scene);

}

function createTrees(scene){

    const trunkMaterial = new THREE.MeshStandardMaterial({
        color:0x5a3d23
    });

    const leafMaterial = new THREE.MeshStandardMaterial({
        color:0x1f4720
    });

    for(let i=0;i<300;i++){

        const tree = new THREE.Group();

        const trunk = new THREE.Mesh(

            new THREE.CylinderGeometry(0.35,0.45,5,8),

            trunkMaterial

        );

        trunk.position.y=2.5;

        tree.add(trunk);

        const leaves = new THREE.Mesh(

            new THREE.ConeGeometry(
                2.3+Math.random(),
                7+Math.random()*2,
                10
            ),

            leafMaterial

        );

        leaves.position.y=7;

        tree.add(leaves);

        tree.position.x=(Math.random()-0.5)*1000;
        tree.position.z=(Math.random()-0.5)*1000;

        tree.rotation.y=Math.random()*Math.PI*2;

        const s=0.7+Math.random()*0.8;

        tree.scale.set(s,s,s);

        scene.add(tree);

    }

}
