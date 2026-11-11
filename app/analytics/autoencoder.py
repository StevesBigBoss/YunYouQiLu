"""A dependency-free sparse autoencoder used for the city representation demo."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Sequence

Point = Sequence[float]


@dataclass(frozen=True)
class SparseAutoencoderResult:
    input_dim: int
    hidden_dim: int
    epochs: int
    final_loss: float
    reconstruction_mse: float
    baseline_mse: float
    mean_hidden_activation: float
    active_fraction: float
    codes: tuple[tuple[float, ...], ...]
    weights_input: tuple[tuple[float, ...], ...]
    bias_input: tuple[float, ...]
    weights_output: tuple[tuple[float, ...], ...]
    bias_output: tuple[float, ...]

    def encode(self, point: Point) -> tuple[float, ...]:
        hidden = [
            _sigmoid(sum(weight * value for weight, value in zip(row, point)) + bias)
            for row, bias in zip(self.weights_input, self.bias_input)
        ]
        return tuple(hidden)


def _sigmoid(value: float) -> float:
    if value >= 0:
        z = math.exp(-value)
        return 1.0 / (1.0 + z)
    z = math.exp(value)
    return z / (1.0 + z)


def _uniform(rng: random.Random, low: float, high: float) -> float:
    return low + (high - low) * rng.random()


def _xavier(rng: random.Random, fan_in: int, fan_out: int) -> list[list[float]]:
    limit = math.sqrt(6.0 / (fan_in + fan_out))
    return [[_uniform(rng, -limit, limit) for _ in range(fan_in)] for _ in range(fan_out)]


def _forward(
    point: Point,
    weights_input: Sequence[Sequence[float]],
    bias_input: Sequence[float],
    weights_output: Sequence[Sequence[float]],
    bias_output: Sequence[float],
) -> tuple[list[float], list[float]]:
    hidden = [
        _sigmoid(sum(weight * value for weight, value in zip(row, point)) + bias)
        for row, bias in zip(weights_input, bias_input)
    ]
    output = [
        _sigmoid(sum(weight * value for weight, value in zip(row, hidden)) + bias)
        for row, bias in zip(weights_output, bias_output)
    ]
    return hidden, output


def _kl_divergence(rho: float, rho_hat: Sequence[float]) -> float:
    total = 0.0
    for value in rho_hat:
        clamped = min(1.0 - 1e-9, max(1e-9, value))
        total += rho * math.log(rho / clamped) + (1.0 - rho) * math.log((1.0 - rho) / (1.0 - clamped))
    return total


def train_sparse_autoencoder(
    points: Sequence[Point],
    *,
    hidden_dim: int = 4,
    epochs: int = 3000,
    learning_rate: float = 0.01,
    sparsity: float = 0.05,
    sparsity_weight: float = 0.05,
    l2: float = 1e-4,
    seed: int = 42,
) -> SparseAutoencoderResult:
    if len(points) < 2:
        raise ValueError("at least two points are required")
    input_dim = len(points[0])
    if input_dim < 2:
        raise ValueError("at least two features are required")
    if not 1 <= hidden_dim < input_dim:
        raise ValueError("hidden_dim must be positive and smaller than input_dim")
    if not 0.0 < sparsity < 1.0:
        raise ValueError("sparsity must be between zero and one")

    rng = random.Random(seed)
    weights_input = _xavier(rng, input_dim, hidden_dim)
    bias_input = [0.0] * hidden_dim
    weights_output = _xavier(rng, hidden_dim, input_dim)
    bias_output = [0.0] * input_dim
    parameters = [
        (weights_input, (hidden_dim, input_dim)),
        (bias_input, (hidden_dim,)),
        (weights_output, (input_dim, hidden_dim)),
        (bias_output, (input_dim,)),
    ]
    first_moment = []
    second_moment = []
    for value, shape in parameters:
        if len(shape) == 2:
            height, width = shape
            first_moment.append([[0.0] * width for _ in range(height)])
            second_moment.append([[0.0] * width for _ in range(height)])
        else:
            first_moment.append([0.0] * len(value))
            second_moment.append([0.0] * len(value))
    beta1 = 0.9
    beta2 = 0.999
    epsilon = 1e-8
    count = len(points)
    final_loss = 0.0
    step = 0
    for epoch in range(1, epochs + 1):
        hidden_batch = [[0.0] * hidden_dim for _ in range(count)]
        output_batch = [[0.0] * input_dim for _ in range(count)]
        for index, point in enumerate(points):
            hidden_batch[index], output_batch[index] = _forward(
                point, weights_input, bias_input, weights_output, bias_output
            )

        rho_hat = [
            sum(hidden_batch[index][unit] for index in range(count)) / count
            for unit in range(hidden_dim)
        ]
        reconstruction = sum(
            (output_batch[index][feature] - points[index][feature]) ** 2
            for index in range(count)
            for feature in range(input_dim)
        ) / (count * input_dim)
        kl = _kl_divergence(sparsity, rho_hat)
        regularization = 0.5 * l2 * (
            sum(value * value for row in weights_input for value in row)
            + sum(value * value for row in weights_output for value in row)
        )
        final_loss = reconstruction + sparsity_weight * kl + regularization

        gradient_input = [[0.0] * input_dim for _ in range(hidden_dim)]
        gradient_bias_input = [0.0] * hidden_dim
        gradient_output = [[0.0] * hidden_dim for _ in range(input_dim)]
        gradient_bias_output = [0.0] * input_dim
        dkl = [
            -sparsity / min(1.0 - 1e-9, max(1e-9, value))
            + (1.0 - sparsity) / (1.0 - min(1.0 - 1e-9, max(1e-9, value)))
            for value in rho_hat
        ]
        for index, point in enumerate(points):
            output = output_batch[index]
            hidden = hidden_batch[index]
            delta_output = [
                2.0 * (output[feature] - point[feature]) / (count * input_dim)
                * output[feature] * (1.0 - output[feature])
                for feature in range(input_dim)
            ]
            for feature in range(input_dim):
                gradient_bias_output[feature] += delta_output[feature]
                for unit in range(hidden_dim):
                    gradient_output[feature][unit] += delta_output[feature] * hidden[unit]
            hidden_error = [
                sum(weights_output[feature][unit] * delta_output[feature] for feature in range(input_dim))
                + sparsity_weight * dkl[unit] / count
                for unit in range(hidden_dim)
            ]
            delta_hidden = [
                hidden_error[unit] * hidden[unit] * (1.0 - hidden[unit])
                for unit in range(hidden_dim)
            ]
            for unit in range(hidden_dim):
                gradient_bias_input[unit] += delta_hidden[unit]
                for feature in range(input_dim):
                    gradient_input[unit][feature] += delta_hidden[unit] * point[feature]

        for unit in range(hidden_dim):
            for feature in range(input_dim):
                gradient_input[unit][feature] += l2 * weights_input[unit][feature]
        for feature in range(input_dim):
            for unit in range(hidden_dim):
                gradient_output[feature][unit] += l2 * weights_output[feature][unit]

        step += 1
        for parameter_index, (value, shape) in enumerate(parameters):
            if len(shape) == 2:
                height, width = shape
                gradient = gradient_input if parameter_index == 0 else gradient_output
                for row in range(height):
                    for column in range(width):
                        _adam(
                            value[row],
                            column,
                            gradient[row][column],
                            first_moment[parameter_index][row],
                            second_moment[parameter_index][row],
                            step,
                            learning_rate,
                            beta1,
                            beta2,
                            epsilon,
                        )
            else:
                gradient = gradient_bias_input if parameter_index == 1 else gradient_bias_output
                _adam_vector(
                    value,
                    gradient,
                    first_moment[parameter_index],
                    second_moment[parameter_index],
                    step,
                    learning_rate,
                    beta1,
                    beta2,
                    epsilon,
                )

    hidden_batch = [[0.0] * hidden_dim for _ in range(count)]
    output_batch = [[0.0] * input_dim for _ in range(count)]
    for index, point in enumerate(points):
        hidden_batch[index], output_batch[index] = _forward(
            point, weights_input, bias_input, weights_output, bias_output
        )
    reconstruction_mse = sum(
        (output_batch[index][feature] - points[index][feature]) ** 2
        for index in range(count)
        for feature in range(input_dim)
    ) / (count * input_dim)
    means = [
        sum(point[feature] for point in points) / count
        for feature in range(input_dim)
    ]
    baseline_mse = sum(
        (point[feature] - means[feature]) ** 2
        for point in points
        for feature in range(input_dim)
    ) / (count * input_dim)
    mean_activation = sum(
        hidden_batch[index][unit] for index in range(count) for unit in range(hidden_dim)
    ) / (count * hidden_dim)
    active_fraction = sum(
        1 for index in range(count) for unit in range(hidden_dim)
        if hidden_batch[index][unit] > 0.1
    ) / (count * hidden_dim)
    rho_hat_final = [
        sum(hidden_batch[index][unit] for index in range(count)) / count
        for unit in range(hidden_dim)
    ]
    final_loss = (
        reconstruction_mse
        + sparsity_weight * _kl_divergence(sparsity, rho_hat_final)
        + 0.5 * l2 * (
            sum(value * value for row in weights_input for value in row)
            + sum(value * value for row in weights_output for value in row)
        )
    )
    return SparseAutoencoderResult(
        input_dim=input_dim,
        hidden_dim=hidden_dim,
        epochs=epochs,
        final_loss=final_loss,
        reconstruction_mse=reconstruction_mse,
        baseline_mse=baseline_mse,
        mean_hidden_activation=mean_activation,
        active_fraction=active_fraction,
        codes=tuple(tuple(row) for row in hidden_batch),
        weights_input=tuple(tuple(row) for row in weights_input),
        bias_input=tuple(bias_input),
        weights_output=tuple(tuple(row) for row in weights_output),
        bias_output=tuple(bias_output),
    )


def _adam(
    row: list[float],
    column: int,
    gradient: float,
    first: list[float],
    second: list[float],
    step: int,
    learning_rate: float,
    beta1: float,
    beta2: float,
    epsilon: float,
) -> None:
    first[column] = beta1 * first[column] + (1.0 - beta1) * gradient
    second[column] = beta2 * second[column] + (1.0 - beta2) * gradient * gradient
    corrected_first = first[column] / (1.0 - beta1 ** step)
    corrected_second = second[column] / (1.0 - beta2 ** step)
    row[column] -= learning_rate * corrected_first / (corrected_second ** 0.5 + epsilon)


def _adam_vector(
    values: list[float],
    gradient: Sequence[float],
    first: list[float],
    second: list[float],
    step: int,
    learning_rate: float,
    beta1: float,
    beta2: float,
    epsilon: float,
) -> None:
    for index in range(len(values)):
        first[index] = beta1 * first[index] + (1.0 - beta1) * gradient[index]
        second[index] = beta2 * second[index] + (1.0 - beta2) * gradient[index] * gradient[index]
        corrected_first = first[index] / (1.0 - beta1 ** step)
        corrected_second = second[index] / (1.0 - beta2 ** step)
        values[index] -= learning_rate * corrected_first / (corrected_second ** 0.5 + epsilon)
