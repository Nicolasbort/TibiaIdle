export class Entity
{
    constructor(playerId, x, y, width, height, sprite, cam)
    {
        this.playerId = playerId;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.sprite = sprite
        this.cam = {
            x: cam.x,
            y: cam.y
        }
    }
}


export class EntityListDict
{
    constructor()
    {
        this.entities = {
            players: {}
        }
    }

    add(entity)
    {
        this.entities.players[entity.playerId] = entity;
    }

    remove(entityId)
    {
        delete this.entities.players[entityId];
    }


    enitityExistis(entity)
    {
        if (entity.playerId in this.entities.players)
        {
            return true;
        }

        return false;
    }

    print()
    {
        console.log(this.entities.players)
    }
}

