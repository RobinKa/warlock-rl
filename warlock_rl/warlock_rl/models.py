import gymnasium as gym
from ray.rllib.models.torch.misc import SlimFC
from ray.rllib.models.torch.torch_modelv2 import TorchModelV2
from ray.rllib.policy.view_requirement import ViewRequirement
from ray.rllib.utils.framework import try_import_torch
from ray.rllib.utils.torch_utils import FLOAT_MIN

torch, nn = try_import_torch()


class TorchFrameStackingModel(TorchModelV2, nn.Module):
    def __init__(
        self,
        obs_space: gym.spaces.Space,
        action_space: gym.spaces.Space,
        num_outputs: int,
        model_config: dict,
        name: str,
        num_frames: int = 3,
    ):
        nn.Module.__init__(self)
        super(TorchFrameStackingModel, self).__init__(
            obs_space, action_space, None, model_config, name
        )

        self.num_frames = num_frames
        self.num_outputs = num_outputs

        # Construct actual (very simple) FC model.
        assert len(obs_space.shape) == 1
        in_size = self.num_frames * obs_space.shape[0]
        self.layer1 = SlimFC(in_size=in_size, out_size=64, activation_fn="tanh")
        self.layer2 = SlimFC(in_size=64, out_size=64, activation_fn="tanh")
        self.out = SlimFC(in_size=64, out_size=self.num_outputs, activation_fn="linear")
        self.values = SlimFC(in_size=64, out_size=1, activation_fn="linear")

        self._last_value = None

        self.view_requirements["prev_n_obs"] = ViewRequirement(
            data_col="obs", shift="-{}:0".format(num_frames - 1), space=obs_space
        )

        self.view_requirements["action_mask"] = ViewRequirement(
            data_col="action_mask", space=action_space
        )

    def forward(self, input_dict, states, seq_lens):
        obs = input_dict["prev_n_obs"]
        action_mask = input_dict["obs"]["action_mask"]

        obs = torch.reshape(obs, [-1, self.obs_space.shape[0] * self.num_frames])
        features = self.layer1(obs)
        features = self.layer2(features)

        out = self.out(features)
        inf_mask = torch.clamp(torch.log(action_mask), min=FLOAT_MIN)

        if isinstance(self.action_space, gym.spaces.Box):
            # TODO: is it
            # [mu1, sigma1, mu2, sigma2, ...]
            # or
            # [mu1, mu2, ..., sigma1, sigma2, ...]?
            assert self.num_outputs % 2 == 0
            out[..., : int(self.num_outputs / 2)] += inf_mask
        else:
            out += inf_mask

        self._last_value = self.values(features)

        return out, []

    def value_function(self):
        return torch.squeeze(self._last_value, -1)
