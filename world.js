// ===========================================
// INFECTED
// world.js
// Version 0.2 - Part 1
// ===========================================

const WORLD = {
    SIZE: 3000,
    HALF: 1500,
    TREES: [],
    OBJECTS: [],
    RANDOM: Math.random
};

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function createWorld(scene) {

    scene.background = new THREE.Color(0x06080a);

    scene.fog = new THREE.FogExp2(
        0x090b0d,
        0.0035
    );

    createLights(scene);

    createTerrain(scene);

}

function createLights(scene){

    const ambient = new THREE.AmbientLight(
        0x8ea0b6,
        0.28
    );

    scene.add(ambient);

    const moon = new THREE.DirectionalLight(
        0xc9dcff,
        1.8
    );

    moon.position.set(
        200,
        350,
        120
    );

    moon.castShadow = true;

    moon.shadow.mapSize.width = 2048;
    moon.shadow.mapSize.height = 2048;

    moon.shadow.camera.left = -500;
    moon.shadow.camera.right = 500;
    moon.shadow.camera.top = 500;
    moon.shadow.camera.bottom = -500;

    scene.add(moon);

}

function createTerrain(scene){

    const geometry = new THREE.PlaneGeometry(

        WORLD.SIZE,
        WORLD.SIZE,
        200,
        200

    );

    const vertices = geometry.attributes.position;

    for(let i=0;i<vertices.count;i++){

        const x = vertices.getX(i);
        const y = vertices.getY(i);

        const height =

            Math.sin(x*0.01)*3+
            Math.cos(y*0.01)*3+
            Math.sin((x+y)*0.005)*6+
            Math.random()*0.3;

        vertices.setZ(i,height);

    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({

        color:0x29452a,

        roughness:1,

        metalness:0

    });

    const ground = new THREE.Mesh(

        geometry,

        material

    );

    ground.rotation.x = -Math.PI/2;

    ground.receiveShadow = true;

    scene.add(ground);

}

function randomPosition(){

    return {

        x:rand(
            -WORLD.HALF,
            WORLD.HALF
        ),

        z:rand(
            -WORLD.HALF,
            WORLD.HALF
        )

    };

}

function distance(a,b){

    const dx=a.x-b.x;
    const dz=a.z-b.z;

    return Math.sqrt(dx*dx+dz*dz);

}

function positionFree(pos,minDistance){

    for(const object of WORLD.OBJECTS){

        if(distance(pos,object)<minDistance){

            return false;

        }

    }

    WORLD.OBJECTS.push(pos);

    return true;

}
