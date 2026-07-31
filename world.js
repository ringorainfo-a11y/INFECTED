import * as THREE from "three";

function createWorld(scene){

    scene.background = new THREE.Color(0x050505);

    scene.fog = new THREE.Fog(0x050505, 50, 500);

    const ambient = new THREE.AmbientLight(0xffffff,0.4);
    scene.add(ambient);

    const moon = new THREE.DirectionalLight(0xbfdfff,1.5);
    moon.position.set(100,150,50);
    moon.castShadow = true;
    scene.add(moon);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(3000,3000),
        new THREE.MeshStandardMaterial({
            color:0x1b2b18
        })
    );

    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;

    scene.add(ground);

}

export { createWorld };
