// ==========================
// INFECTED - World v0.1
// ==========================

function createWorld(scene) {

    // Nebel
    scene.fog = new THREE.Fog(0x101010, 20, 180);

    // Licht
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const moon = new THREE.DirectionalLight(0xbfdfff, 1.2);
    moon.position.set(30, 60, 20);
    scene.add(moon);

    // Boden
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(500, 500),
        new THREE.MeshStandardMaterial({
            color: 0x2d6b2d
        })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

}
