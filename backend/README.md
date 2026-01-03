# Backend Setup

Typescript here is compiled and run using `ts-node` instead of `tsx` due to an issue with [type inference](https://github.com/typeorm/typeorm/issues/2897)

```
src/
|- middleware/
|- routes/
|- types/
|- utils/
|- entities/
```