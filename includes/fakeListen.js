module.exports = function ({ api, models }) {
  // Import các controllers quản lý người dùng, nhóm chat, tiền tệ
  const Users = require("./controllers/users")({ models, api });
  const Threads = require("./controllers/threads")({ models, api });
  const Currencies = require("./controllers/currencies")({ models });

  // Import các trình xử lý sự kiện
  const handleCommand = require("./handle/handleCommand")({ api, models, Users, Threads, Currencies });
  const handleCommandEvent = require("./handle/handleCommandEvent")({ api, models, Users, Threads, Currencies });
  const handleReply = require("./handle/handleReply")({ api, models, Users, Threads, Currencies });
  const handleReaction = require("./handle/handleReaction")({ api, models, Users, Threads, Currencies });
  const handleEvent = require("./handle/handleEvent")({ api, models, Users, Threads, Currencies });
  const handleCreateDatabase = require("./handle/handleCreateDatabase")({ api, Threads, Users, Currencies, models });

  // Xử lý sự kiện được nhận
  return (event) => {
    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        // Xử lý khởi tạo database, lệnh, phản hồi, sự kiện đặc biệt
        handleCreateDatabase({ event });
        handleCommand({ event });
        handleReply({ event });
        handleCommandEvent({ event });
        break;
      case "event":
        // Xử lý sự kiện nhóm (thêm, xóa người, đổi tên nhóm,...)
        handleEvent({ event });
        break;
      case "message_reaction":
        // Xử lý khi có người thả cảm xúc vào tin nhắn
        handleReaction({ event });
        break;
      default:
        break;
    }
  };
};
