import os from "os";
import fs from "fs";
import { DockerDriver } from "./driver_docker";

export class Image {
    name: string = "";
    key: string = "";
    status: string = "";
    size: number = -1;
    timestamp: Date | null = null;
}


export class Port {
    name: string = "";
    type: string = "ipv4";
    ip: string | null = null;
    port: number = -1;
}

export class InstanceState {
    static INITIALIZING: string = "INITIALIZING";
    static RUNNING: string = "RUNNING";
    static STOPPED: string = "STOPPED";
    static PAUSED: string = "PAUSED";
    static DEAD: string = "DEAD";
    static RESTARTING: string = "RESTARTING";
    static BUSY: string = "BUSY";
    static ZOMBIE: string = "ZOMBIE";
    static TERMINATED: string = "TERMINATED";
    static UNKNOWN: string = "UNKNOWN";
}

export class Instance {
    key: string = "";
    name: string = "";
    image: Image | null = null;
    state: InstanceState = InstanceState.INITIALIZING;
    cpu: number = -1;
    memory: number = -1;
    storage: number = -1;
    total_storage: number = -1;
    status: string | null = "";
    command: string | null = "";
    network_mode: string | null = "";
    mount_infos: string | null = "";
    local_ipv4: string | null = null;
    local_ipv6: string | null = null;
    global_ipv4: string | null = null;
    global_ipv6: string | null = null;
    ports: Port[] | null = [];
    timestamp: Date | null = null;
}

export interface Driver {
    init(): Promise<void>;
    test(): Promise<boolean>;
    list_image(params: any): Promise<Image[]>;
    delete_image(params: any): Promise<Image | null>;
    save_image(params: any): Promise<Image | null>;
    load_image(params: any): Promise<Image | null>;
    // list_remote_image(): Promise<Image[]>;
    list_instance(params: any): Promise<Instance[]>;
    delete_instance(params: any): Promise<Instance | null>;
    create_instance(params: any): Promise<Instance | null>;
    stop_instance(params: any): Promise<Instance | null>;
    start_instance(params: any): Promise<Instance | null>;
    // port_map(): Promise<Port>;
    handle_event(event: any): any;

}


export function CreateDriver(config: any, driver: string) {
    switch (driver) {
        case "docker": return new DockerDriver(config);
        case "nvidia-docker": return new DockerDriver(config);
        case "kvm": throw new Error("Not implemented yet");
        case "lxd": throw new Error("Not implemented yet");
        case "podman": throw new Error("Not implemented yet");
        default:
            throw new Error("Driver not found");
    }
}