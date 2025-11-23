import { DataTypes } from "sequelize";

export default (sequelize) => sequelize.define("Carousel", {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    image_url: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    title: { 
        type: DataTypes.STRING, 
        allowNull: true 
    },
    description: { 
        type: DataTypes.TEXT, 
        allowNull: true 
    },
    link: { 
        type: DataTypes.STRING, 
        allowNull: true 
    },
    order_index: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0 
    },
    is_active: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    }
}, { 
    tableName: "carousels", 
    timestamps: true 
});