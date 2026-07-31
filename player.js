import * as THREE from "three";

export class Player {

    constructor(camera, scene){

        this.camera = camera;
        this.scene = scene;

        this.height = 1.8;

        this.walkSpeed = 6;
        this.runSpeed = 11;

        this.velocity = new THREE.Vector3();

        this.keys = {};

        this.pitch = 0;
        this.yaw = 0;

        this.pointerLocked = false;

        this.player = new THREE.Object3D();
        this.player.position.set(0, this.height, 0);

        scene.add(this.player);

        this.player.add(camera);

        camera.position.set(0,0,0);

        this.initControls();

    }

    initControls(){

        document.addEventListener("keydown",(e)=>{
            this.keys[e.code]=true;
        });

        document.addEventListener("keyup",(e)=>{
            this.keys[e.code]=false;
        });

        document.addEventListener("click",()=>{

            if(!this.pointerLocked){

                document.body.requestPointerLock();

            }

        });

        document.addEventListener("pointerlockchange",()=>{

            this.pointerLocked =
                document.pointerLockElement===document.body;

        });
        document.addEventListener("mousemove",(e)=>{
    this.onMouseMove(e);
});

    }

}
onMouseMove(event){

        if(!this.pointerLocked) return;

        const sensitivity = 0.002;

        this.yaw -= event.movementX * sensitivity;
        this.pitch -= event.movementY * sensitivity;

        const limit = Math.PI / 2 - 0.05;

        this.pitch = Math.max(-limit, Math.min(limit, this.pitch));

        this.player.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

    }

    update(delta){

        const speed = this.keys["ShiftLeft"]
            ? this.runSpeed
            : this.walkSpeed;

        const direction = new THREE.Vector3();

        if(this.keys["KeyW"]) direction.z -= 1;
        if(this.keys["KeyS"]) direction.z += 1;
        if(this.keys["KeyA"]) direction.x -= 1;
        if(this.keys["KeyD"]) direction.x += 1;

        if(direction.length()>0){

            direction.normalize();

            direction.applyAxisAngle(
                new THREE.Vector3(0,1,0),
                this.yaw
            );

            this.player.position.addScaledVector(
                direction,
                speed * delta
            );

        }

    }
