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
// ===========================================
// WORLD GENERATION - PART 2
// Trees, Dead Trees, Bushes, Rocks
// ===========================================

function createForest(scene){

    createPineTrees(scene,350);
    createDeadTrees(scene,120);
    createBushes(scene,500);
    createRocks(scene,300);

}

function createPineTrees(scene,count){

    const trunkMaterial = new THREE.MeshStandardMaterial({
        color:0x5d4125,
        roughness:1
    });

    const leafMaterial = new THREE.MeshStandardMaterial({
        color:0x224422,
        roughness:1
    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,5)){
            i--;
            continue;
        }

        const tree=new THREE.Group();

        const trunkHeight=rand(7,14);

        const trunk=new THREE.Mesh(

            new THREE.CylinderGeometry(
                0.3,
                0.55,
                trunkHeight,
                8
            ),

            trunkMaterial

        );

        trunk.position.y=trunkHeight/2;

        trunk.castShadow=true;

        tree.add(trunk);

        const layers=3+Math.floor(Math.random()*2);

        for(let j=0;j<layers;j++){

            const cone=new THREE.Mesh(

                new THREE.ConeGeometry(

                    rand(2.5,4),

                    rand(4,7),

                    10

                ),

                leafMaterial

            );

            cone.position.y=
                trunkHeight-
                j*2;

            cone.castShadow=true;

            tree.add(cone);

        }

        tree.position.set(
            pos.x,
            0,
            pos.z
        );

        tree.rotation.y=Math.random()*Math.PI*2;

        const s=rand(.8,1.5);

        tree.scale.set(s,s,s);

        scene.add(tree);

        WORLD.TREES.push(tree);

    }

}

function createDeadTrees(scene,count){

    const material=new THREE.MeshStandardMaterial({

        color:0x4a3a2d,

        roughness:1

    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,7)){
            i--;
            continue;
        }

        const tree=new THREE.Mesh(

            new THREE.CylinderGeometry(

                0.25,
                0.45,
                rand(6,11),
                6

            ),

            material

        );

        tree.position.set(

            pos.x,

            rand(3,6),

            pos.z

        );

        tree.rotation.z=rand(-0.2,0.2);

        tree.rotation.y=Math.random()*Math.PI*2;

        tree.castShadow=true;

        scene.add(tree);

    }

}

function createBushes(scene,count){

    const material=new THREE.MeshStandardMaterial({

        color:0x355b2b

    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,2)){
            i--;
            continue;
        }

        const bush=new THREE.Mesh(

            new THREE.SphereGeometry(

                rand(.4,1.1),

                8,

                8

            ),

            material

        );

        bush.scale.y=.6;

        bush.position.set(

            pos.x,

            .5,

            pos.z

        );

        bush.castShadow=true;

        scene.add(bush);

    }

}

function createRocks(scene,count){

    const material=new THREE.MeshStandardMaterial({

        color:0x5e6368,

        roughness:1

    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,3)){
            i--;
            continue;
        }

        const rock=new THREE.Mesh(

            new THREE.DodecahedronGeometry(

                rand(.3,1.6)

            ),

            material

        );

        rock.position.set(

            pos.x,

            rand(.3,1),

            pos.z

        );

        rock.rotation.set(

            Math.random()*5,

            Math.random()*5,

            Math.random()*5

        );

        rock.castShadow=true;

        scene.add(rock);

    }

}
// ===========================================
// WORLD GENERATION - PART 3A
// Fallen Trees + Stumps + Fir Trees
// ===========================================

function createForest(scene){

    createPineTrees(scene,350);
    createFirTrees(scene,180);
    createDeadTrees(scene,120);
    createBushes(scene,500);
    createRocks(scene,300);
    createStumps(scene,150);
    createLogs(scene,120);

}

function createFirTrees(scene,count){

    const trunkMat=new THREE.MeshStandardMaterial({
        color:0x4d311c
    });

    const leafMat=new THREE.MeshStandardMaterial({
        color:0x163a18
    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,6)){
            i--;
            continue;
        }

        const tree=new THREE.Group();

        const h=rand(12,20);

        const trunk=new THREE.Mesh(

            new THREE.CylinderGeometry(
                .35,
                .6,
                h,
                8
            ),

            trunkMat

        );

        trunk.position.y=h/2;

        tree.add(trunk);

        for(let j=0;j<5;j++){

            const cone=new THREE.Mesh(

                new THREE.ConeGeometry(

                    rand(2.5,4),

                    rand(4,6),

                    10

                ),

                leafMat

            );

            cone.position.y=h-j*2;

            tree.add(cone);

        }

        tree.position.set(
            pos.x,
            0,
            pos.z
        );

        tree.rotation.y=Math.random()*6.28;

        const s=rand(.8,1.4);

        tree.scale.set(s,s,s);

        scene.add(tree);

    }

}

function createStumps(scene,count){

    const mat=new THREE.MeshStandardMaterial({

        color:0x604127

    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,2)){
            i--;
            continue;
        }

        const stump=new THREE.Mesh(

            new THREE.CylinderGeometry(

                .4,

                .5,

                rand(.6,1.4),

                8

            ),

            mat

        );

        stump.position.set(
            pos.x,
            .5,
            pos.z
        );

        stump.castShadow=true;

        scene.add(stump);

    }

}

function createLogs(scene,count){

    const mat=new THREE.MeshStandardMaterial({

        color:0x5b3b21

    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,5)){
            i--;
            continue;
        }

        const log=new THREE.Mesh(

            new THREE.CylinderGeometry(

                .45,

                .45,

                rand(3,7),

                10

            ),

            mat

        );

        log.rotation.z=Math.PI/2;

        log.rotation.y=Math.random()*6.28;

        log.position.set(

            pos.x,

            .5,

            pos.z

        );

        log.castShadow=true;

        scene.add(log);

    }

}
createGrass(scene,2500);
createFerns(scene,700);
createLeaves(scene,1800);
// ===========================================
// WORLD GENERATION - PART 3B
// Grass - Ferns - Leaves
// ===========================================

function createGrass(scene,count){

    const material=new THREE.MeshStandardMaterial({

        color:0x3d6d2e,
        side:THREE.DoubleSide

    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,.5)){
            continue;
        }

        const blade=new THREE.Mesh(

            new THREE.PlaneGeometry(
                rand(.15,.35),
                rand(.5,1.2)
            ),

            material

        );

        blade.position.set(
            pos.x,
            .4,
            pos.z
        );

        blade.rotation.y=Math.random()*Math.PI;

        blade.castShadow=true;

        scene.add(blade);

    }

}

function createFerns(scene,count){

    const material=new THREE.MeshStandardMaterial({

        color:0x2f5b22,
        side:THREE.DoubleSide

    });

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        if(!positionFree(pos,1)){
            continue;
        }

        const fern=new THREE.Group();

        for(let j=0;j<6;j++){

            const leaf=new THREE.Mesh(

                new THREE.PlaneGeometry(

                    .15,

                    rand(.5,.9)

                ),

                material

            );

            leaf.position.y=.4;

            leaf.rotation.z=
                -0.5+
                j*.2;

            leaf.rotation.y=
                Math.PI/3*j;

            fern.add(leaf);

        }

        fern.position.set(

            pos.x,

            0,

            pos.z

        );

        scene.add(fern);

    }

}

function createLeaves(scene,count){

    const colors=[

        0x4e5a24,
        0x5c682c,
        0x62451f,
        0x735126

    ];

    for(let i=0;i<count;i++){

        const pos=randomPosition();

        const material=new THREE.MeshStandardMaterial({

            color:colors[
                Math.floor(
                    Math.random()*colors.length
                )
            ]

        });

        const leaf=new THREE.Mesh(

            new THREE.CircleGeometry(

                rand(.04,.09),

                5

            ),

            material

        );

        leaf.rotation.x=-Math.PI/2;

        leaf.position.set(

            pos.x,

            .02,

            pos.z

        );

        scene.add(leaf);

    }

}
