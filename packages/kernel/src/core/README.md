# Kernel Core

Foundation types and port interfaces for the entire kernel. Every kernel subsystem depends on core. The `Kernel` interface is the single entry point that composes all subsystems.

## Key Types
- `ServiceStatus` / `ServiceScope` / `Priority` / `LifecyclePhase` — Enum-like unions
- `ServiceMetadata` — Service registration descriptor
- `KernelConfig` — Root configuration
- `Result<T, E>` — Universal result wrapper

## Port Interfaces
Every subsystem exposes a port interface (e.g., `CommandBusPort`, `SchedulerPort`) that the `Kernel` composes. Ports define what the subsystem does; implementations live in each subsystem's folder.
