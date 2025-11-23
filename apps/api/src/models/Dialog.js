import { DataTypes } from "sequelize";

export default (sequelize) => sequelize.define("Dialog", {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    title: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    description: { 
        type: DataTypes.TEXT, 
        allowNull: false 
    },
    image: { 
        type: DataTypes.STRING, 
        allowNull: true 
    },
    show_dialog: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    is_active: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    },
    start_date: { 
        type: DataTypes.DATE, 
        allowNull: true 
    },
    end_date: { 
        type: DataTypes.DATE, 
        allowNull: true 
    }
}, { 
    tableName: "dialogs", 
    timestamps: true 
});